import { BaseFilter } from '../models/base-filter-props';
import { Page } from '../models/page';

export interface IRepository<T, ID, F> {
  findPaged(filter?: BaseFilter<F>): Promise<Page<T>>;
  findAll(filter?: F): Promise<T[]>;
  findById(id: ID): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(id: ID, entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
  count(filter: F): Promise<number>;
}
