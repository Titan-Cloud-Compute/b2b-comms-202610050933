import { VendorOnboardingController } from './vendor-onboarding.controller';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('VendorOnboardingController', () => {
  let profiles: any[];
  let documents: any[];
  let controller: VendorOnboardingController;

  const req = (userId: string) => ({ session: { userId, email: 'vendor@acme.example.com', role: 'VENDOR' } }) as any;

  beforeEach(() => {
    profiles = [];
    documents = [];
    const prisma = {
      vendorProfile: {
        findUnique: jest.fn(async ({ where }: any) => profiles.find((p) => p.userId === where.userId) ?? null),
        create: jest.fn(async ({ data }: any) => {
          const p = { id: `vp-${profiles.length + 1}`, ...data };
          profiles.push(p);
          return p;
        }),
      },
      document: {
        create: jest.fn(async ({ data }: any) => {
          const d = { id: `doc-${documents.length + 1}`, createdAt: new Date(), ...data };
          documents.push(d);
          return d;
        }),
        findMany: jest.fn(async ({ where }: any) => documents.filter((d) => d.vendorProfileId === where.vendorProfileId)),
      },
    };
    controller = new VendorOnboardingController(new VendorOnboardingService(prisma as unknown as PrismaService));
  });

  it('creates the vendor profile and returns the record', async () => {
    const res = await controller.postApiVendorProfile(req('u1'), { companyName: 'Acme', contactEmail: 'a@acme.test' });
    expect(res).toEqual({ id: 'vp-1', companyName: 'Acme', contactEmail: 'a@acme.test' });
    expect(profiles[0].userId).toBe('u1');
  });

  it('rejects a duplicate profile', async () => {
    await controller.postApiVendorProfile(req('u1'), { companyName: 'Acme', contactEmail: 'a@acme.test' });
    await expect(
      controller.postApiVendorProfile(req('u1'), { companyName: 'Acme', contactEmail: 'a@acme.test' }),
    ).rejects.toThrow();
  });

  it('stores an uploaded document as pending and lists it', async () => {
    await controller.postApiVendorProfile(req('u1'), { companyName: 'Acme', contactEmail: 'a@acme.test' });
    const doc = await controller.postApiVendorDocuments(req('u1'), { filename: 'w9.pdf' });
    expect(doc).toEqual({ id: 'doc-1', filename: 'w9.pdf', status: 'pending' });
    const list = await controller.getApiVendorDocuments(req('u1'));
    expect(list).toEqual([{ id: 'doc-1', filename: 'w9.pdf', status: 'pending' }]);
  });

  it('rejects document upload without a profile', async () => {
    await expect(controller.postApiVendorDocuments(req('u2'), { filename: 'w9.pdf' })).rejects.toThrow();
  });

  it('returns an empty library when no profile exists', async () => {
    expect(await controller.getApiVendorDocuments(req('u3'))).toEqual([]);
  });
});
