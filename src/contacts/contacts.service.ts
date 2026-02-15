import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { User } from '../users/entities/user.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { FilterContactsDto } from './dto/filter-contacts.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userId: number, createContactDto: CreateContactDto): Promise<Contact> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const contact = this.contactsRepository.create({
      ...createContactDto,
      user_id: userId,
    });

    return this.contactsRepository.save(contact);
  }

  async findAll(userId: number, filterDto: FilterContactsDto): Promise<{ data: Contact[]; total: number }> {
    const { 
      search, 
      isFavorite, 
      isImportant, 
      company, 
      sortBy = 'name', 
      sortOrder = 'ASC', 
      page = 1, 
      limit = 20 
    } = filterDto;

    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: FindOptionsWhere<Contact> = { user_id: userId };

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (isFavorite !== undefined) {
      where.is_favorite = isFavorite;
    }

    if (isImportant !== undefined) {
      where.is_important = isImportant;
    }

    if (company) {
      where.company = Like(`%${company}%`);
    }

    // Execute query
    const [data, total] = await this.contactsRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async findOne(userId: number, id: number): Promise<Contact> {
    const contact = await this.contactsRepository.findOne({ 
      where: { id, user_id: userId } 
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async update(userId: number, id: number, updateContactDto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(userId, id);
    
    // Update only provided fields
    Object.assign(contact, updateContactDto);
    
    return this.contactsRepository.save(contact);
  }

  async remove(userId: number, id: number): Promise<void> {
    const result = await this.contactsRepository.delete({ id, user_id: userId });
    
    if (result.affected === 0) {
      throw new NotFoundException('Contact not found');
    }
  }

  async toggleFavorite(userId: number, id: number): Promise<Contact> {
    const contact = await this.findOne(userId, id);
    contact.is_favorite = !contact.is_favorite;
    return this.contactsRepository.save(contact);
  }

  async getStats(userId: number): Promise<any> {
    const total = await this.contactsRepository.count({ where: { user_id: userId } });
    
    const favorites = await this.contactsRepository.count({ 
      where: { 
        user_id: userId, 
        is_favorite: true 
      } 
    });
    
    // Get distinct companies count
    const companiesResult = await this.contactsRepository
      .createQueryBuilder('contact')
      .select('COUNT(DISTINCT contact.company)', 'count')
      .where('contact.user_id = :userId', { userId })
      .andWhere('contact.company IS NOT NULL')
      .andWhere('contact.company != :empty', { empty: '' })
      .getRawOne();
    
    // Get recent contacts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recent = await this.contactsRepository.count({
      where: {
        user_id: userId,
        created_at: Between(thirtyDaysAgo, new Date())
      }
    });

    return {
      total,
      favorites,
      companies: parseInt(companiesResult?.count) || 0,
      recent,
    };
  }

  async bulkDelete(userId: number, ids: number[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No contact IDs provided');
    }

    await this.contactsRepository
      .createQueryBuilder()
      .delete()
      .from(Contact)
      .where('user_id = :userId', { userId })
      .andWhere('id IN (:...ids)', { ids })
      .execute();
  }

  async searchContacts(userId: number, query: string): Promise<Contact[]> {
    return this.contactsRepository
      .createQueryBuilder('contact')
      .where('contact.user_id = :userId', { userId })
      .andWhere(
        '(contact.name LIKE :query OR contact.phone LIKE :query OR contact.email LIKE :query OR contact.company LIKE :query)',
        { query: `%${query}%` }
      )
      .take(10)
      .getMany();
  }
}