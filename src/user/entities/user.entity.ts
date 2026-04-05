import { IUser } from '../../common/interfaces/user.interface';

export class User implements IUser {
  id: string;
  login: string;
  password: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: number;
  updatedAt: number;
}
