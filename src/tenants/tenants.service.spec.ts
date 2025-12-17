/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { Repository } from 'typeorm';

describe('TenantsService', () => {
  let service: TenantsService;
  let repo: Repository<Tenant>;

  const mockTenantRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    repo = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================
  // create()
  // ===========================
  it('should create a tenant and return id and random apiKey', async () => {
    const dto = { name: 'Test Tenant' };

    const fakeTenant = {
      id: 'uuid-123',
      name: dto.name,
      apiKey: 'randomapikeyvalue',
    };

    mockTenantRepository.create.mockReturnValue(fakeTenant);
    mockTenantRepository.save.mockResolvedValue(fakeTenant);

    const result = await service.create(dto);

    expect(repo.create).toHaveBeenCalledWith({
      name: dto.name,
      apiKey: expect.any(String),
    });

    expect(repo.save).toHaveBeenCalledWith(fakeTenant);

    expect(result).toEqual({
      id: fakeTenant.id,
      apiKey: expect.any(String),
    });

    expect(result.apiKey.length).toBeGreaterThan(20);
  });

  // ===========================
  // findByApiKey()
  // ===========================
  it('should return tenant when apiKey exists', async () => {
    const apiKey = 'some-random-key';
    const tenant = { id: '1', apiKey };

    mockTenantRepository.findOneBy.mockResolvedValue(tenant);

    const result = await service.findByApiKey(apiKey);

    expect(repo.findOneBy).toHaveBeenCalledWith({ apiKey });
    expect(result).toEqual(tenant);
  });

  it('should return null when apiKey does not exist', async () => {
    mockTenantRepository.findOneBy.mockResolvedValue(null);

    const result = await service.findByApiKey('invalid-key');

    expect(result).toBeNull();
  });
});
