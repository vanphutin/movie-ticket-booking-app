import { UnauthorizedError } from './auth.errors';
import type { UserProfile, ProfileReaderPort } from './ports/profile-reader.port';

export class GetProfileUseCase {
  constructor(private readonly profileReader: ProfileReaderPort) {}

  async execute(actorId: string): Promise<UserProfile> {
    const userProfile = await this.profileReader.findProfileById(actorId);
    if (userProfile) {
      return userProfile;
    }
    throw new UnauthorizedError();
  }
}
