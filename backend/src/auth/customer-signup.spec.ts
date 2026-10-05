/**
 * Public self-serve signup: an email + password with NO registration token
 * (after the bootstrap admin exists) creates a CUSTOMER user and issues a
 * session token. A supplied token keeps the invite path (USER).
 */

import { AuthService } from './auth.service';

function makeService(existingUsers: number) {
  const create = jest.fn().mockImplementation(({ data }) =>
    Promise.resolve({ id: 'u-1', ...data }),
  );
  const tx = {
    user: {
      count: jest.fn().mockResolvedValue(existingUsers),
      create,
      update: jest.fn().mockResolvedValue({}),
    },
    registrationToken: {
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn(),
    },
  };
  const prisma = {
    runAsAdmin: (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as ConstructorParameters<typeof AuthService>[0];
  const jwt = { signAsync: jest.fn().mockResolvedValue('jwt-token') };
  const service = new AuthService(prisma, jwt as never, {} as never, {} as never);
  return { service, create, tx };
}

describe('AuthService.signup — customer self-signup', () => {
  it('creates a CUSTOMER when no registration token is supplied', async () => {
    const { service, create } = makeService(3);

    const { user, token } = await service.signup({
      email: 'NewUser@Example.com',
      password: 'Password1!',
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data).toMatchObject({
      email: 'newuser@example.com',
      role: 'CUSTOMER',
    });
    expect(user.role).toBe('CUSTOMER');
    expect(token).toBe('jwt-token');
  });

  it('still makes the very first user the bootstrap ADMIN', async () => {
    const { service, create } = makeService(0);

    await service.signup({ email: 'first@example.com', password: 'Password1!' });

    expect(create.mock.calls[0][0].data).toMatchObject({ role: 'ADMIN' });
  });

  it('rejects an invalid registration token instead of falling back to CUSTOMER', async () => {
    const { service, create } = makeService(3);

    await expect(
      service.signup({
        email: 'invitee@example.com',
        password: 'Password1!',
        registrationToken: 'a'.repeat(48),
      }),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a short password', async () => {
    const { service } = makeService(3);
    await expect(
      service.signup({ email: 'x@example.com', password: 'short' }),
    ).rejects.toThrow();
  });
});
