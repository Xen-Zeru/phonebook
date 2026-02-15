import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    // Map possible camelCase DTO properties to the entity's snake_case columns
    const dto: any = updateUserDto as any;

    if (dto.firstName !== undefined) {
      user.first_name = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.last_name = dto.lastName;
    }
    // Accept both snake_case and camelCase for backward compatibility
    if (dto.first_name !== undefined) {
      user.first_name = dto.first_name;
    }
    if (dto.last_name !== undefined) {
      user.last_name = dto.last_name;
    }

    // Assign remaining fields (phone, address, timezone, avatar_url, etc.)
    const { firstName, lastName, first_name, last_name, ...rest } = dto;
    Object.assign(user, rest);

    return this.usersRepository.save(user);
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<User> {
    const user = await this.findOne(id);
    user.avatar_url = avatarUrl;
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      last_login: new Date(),
    });
  }
}