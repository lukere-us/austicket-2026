import sqlPkg from '@adminjs/sql'

const Adapter = sqlPkg?.default ?? sqlPkg?.Adapter ?? sqlPkg
const Database = sqlPkg?.Database
const Resource = sqlPkg?.Resource

export { Adapter, Database, Resource }
