import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<any> {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user exists
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = this.usersRepository.create({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
    });

    const savedUser = await this.usersRepository.save(user);

    // Remove password from response
    const { password_hash, ...result } = savedUser;
    
    return {
      message: 'User registered successfully',
      user: result,
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // More specific message per user request
      throw new UnauthorizedException('Wrong password');
    }

    // Update last login
    user.last_login = new Date();
    await this.usersRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Remove password from response
    const { password_hash, ...userData } = user;

    return {
      message: 'Login successful',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: userData,
    };
  }

  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role 
    };

    const accessToken = this.jwtService.sign(payload);
    
    // Create refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshTokenEntity = this.refreshTokensRepository.create({
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt,
    });

    await this.refreshTokensRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<any> {
    const tokenEntity = await this.refreshTokensRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenEntity || tokenEntity.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Delete old refresh token
    await this.refreshTokensRepository.delete(tokenEntity.id);

    // Generate new tokens
    return this.generateTokens(tokenEntity.user);
  }

  // forgotPassword and resetPassword features removed

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokensRepository.delete({ token: refreshToken });
  }

  async validateUser(payload: any): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}