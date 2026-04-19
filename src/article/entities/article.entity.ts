export class Article {
  id: string;
  title: string;
  content: string;
  status: string;
  authorId: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
