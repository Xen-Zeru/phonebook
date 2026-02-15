import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

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
    const dto: any = updateUserDto as any;

    if (dto.firstName !== undefined) user.first_name = dto.firstName;
    if (dto.lastName !== undefined) user.last_name = dto.lastName;
    if (dto.first_name !== undefined) user.first_name = dto.first_name;
    if (dto.last_name !== undefined) user.last_name = dto.last_name;

    const { firstName, lastName, first_name, last_name, ...rest } = dto;
    Object.assign(user, rest);

    return this.usersRepository.save(user);
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<User> {
    const user = await this.findOne(id);
    user.avatar_url = avatarUrl;
    return this.usersRepository.save(user);
  }

  async uploadToCloudinary(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'avatars' },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
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
