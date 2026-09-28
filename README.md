<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Products Microservice

## Dev

1. Clonar el repositorio
2. Instalar las dependencias

   ```bash
   $ npm install
   ```

3. Crear un archivo `.env` basado en el archivo `.env.template`
4. Ejecutar la migracion de prisma `npx prisma migrate dev`
5. Generar la base de datos `npx prisma generate`
6. Ejecutar `npm run start:dev` para ejecutar en modo watch

## update Database

```bash
# migration
$ npx prisma migrate dev --name [migration name]

# genearte
$ npx prisma generate

```
