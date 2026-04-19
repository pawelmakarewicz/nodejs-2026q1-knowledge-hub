import { ICategory } from '../../common/interfaces/category.interface';

export class Category implements ICategory {
  id: string;
  name: string;
  description: string;
}
