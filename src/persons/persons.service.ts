import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from './entities/person.entity';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ) {}

  async create(userId: string, dto: CreatePersonDto): Promise<Person> {
    this.validateName(dto.name);
    await this.ensureNameIsAvailable(userId, dto.name);
    return this.personRepository.save(
      this.personRepository.create({ userId, name: dto.name.trim() }),
    );
  }

  findAll(userId: string): Promise<Person[]> {
    return this.personRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Person> {
    const person = await this.personRepository.findOne({
      where: { id, userId },
    });
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    return person;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdatePersonDto,
  ): Promise<Person> {
    const person = await this.findOne(id, userId);
    if (dto.name !== undefined) {
      this.validateName(dto.name);
      await this.ensureNameIsAvailable(userId, dto.name, id);
      person.name = dto.name.trim();
    }
    return this.personRepository.save(person);
  }

  async remove(id: string, userId: string): Promise<void> {
    const person = await this.findOne(id, userId);
    const transactionCount = await this.personRepository.manager.count(
      'transactions',
      { where: { personId: id } },
    );
    if (transactionCount > 0) {
      throw new ConflictException(
        'This person cannot be deleted because they have transactions',
      );
    }
    await this.personRepository.remove(person);
  }

  private validateName(name: string): void {
    if (!name.trim()) throw new BadRequestException('Name cannot be empty');
  }

  private async ensureNameIsAvailable(
    userId: string,
    name: string,
    excludedId?: string,
  ): Promise<void> {
    const query = this.personRepository
      .createQueryBuilder('person')
      .where('person.userId = :userId', { userId })
      .andWhere('LOWER(person.name) = LOWER(:name)', { name: name.trim() });
    if (excludedId) query.andWhere('person.id != :excludedId', { excludedId });
    if (await query.getOne()) {
      throw new ConflictException('A person with this name already exists');
    }
  }
}
