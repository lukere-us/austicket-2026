import Adapter, { Database, Resource } from '@adminjs/sql'

/**
 * Knex MySQL `whereLike` appends `COLLATE utf8_bin`, which fails on utf8mb4
 * tables ("COLLATION 'utf8_bin' is not valid for CHARACTER SET 'utf8mb4'").
 * AdminJS string filters use whereLike for non-Postgres dialects — override
 * those filters to plain LIKE (case-insensitive under typical utf8mb4_*_ci).
 */
if (typeof Resource?.prototype?.filterQuery === 'function') {
  Resource.prototype.filterQuery = function filterQuery(filter) {
    const knex = this.schemaName
      ? this.knex(this.tableName).withSchema(this.schemaName)
      : this.knex(this.tableName)
    const q = knex
    if (!filter) return q

    const { filters } = filter
    Object.entries(filters ?? {}).forEach(([key, filterItem]) => {
      const type = filterItem.property.type()
      if (
        typeof filterItem.value === 'object' &&
        (type === 'date' || type === 'datetime')
      ) {
        q.whereBetween(key, [filterItem.value.from, filterItem.value.to])
      } else if (type === 'string' && !filterItem.property.availableValues()) {
        if (this.dialect === 'postgresql') {
          q.whereILike(key, `%${filterItem.value}%`)
        } else {
          q.where(key, 'like', `%${filterItem.value}%`)
        }
      } else {
        q.where(key, filterItem.value)
      }
    })
    return q
  }
}

export { Adapter, Database, Resource }
