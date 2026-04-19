import { IComment } from '../../common/interfaces/comment.interface';

export class Comment implements IComment {
  id: string;
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: number;
}
