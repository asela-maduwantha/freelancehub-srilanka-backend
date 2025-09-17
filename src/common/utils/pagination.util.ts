import { PaginationDto, PaginationResult } from '../dto/pagination.dto';

export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function getPaginationParams(dto: PaginationDto) {
  const page = dto.page || 1;
  const limit = dto.limit || 10;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}