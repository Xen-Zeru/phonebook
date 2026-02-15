import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  Query, 
  ParseIntPipe 
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { FilterContactsDto } from './dto/filter-contacts.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Request() req, @Body() createContactDto: CreateContactDto) {
    return this.contactsService.create(req.user.id, createContactDto);
  }

  @Get()
  findAll(@Request() req, @Query() filterDto: FilterContactsDto) {
    return this.contactsService.findAll(req.user.id, filterDto);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.contactsService.getStats(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.contactsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return this.contactsService.update(req.user.id, id, updateContactDto);
  }

  @Patch(':id/favorite')
  toggleFavorite(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.contactsService.toggleFavorite(req.user.id, id);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.contactsService.remove(req.user.id, id);
  }

  @Delete('bulk')
  bulkDelete(@Request() req, @Body() body: { ids: number[] }) {
    return this.contactsService.bulkDelete(req.user.id, body.ids);
  }
}