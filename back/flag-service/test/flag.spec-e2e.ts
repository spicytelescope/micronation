import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DatabaseClientService } from 'library/database/client/DatabaseClientService';
import * as DirectusModule from "@directus/sdk";
import { AuthToken, Directus, PartialItem, QueryOne, TypeOf, UserItem } from "@directus/sdk";
import { bootstrap } from "../src/bootstrap";
import { AuthBackend } from "../src/user/AuthBackend";
import { registerAndLogin } from "./util/registerAndLogin";
import { v4 } from "uuid";

jest.mock('@directus/sdk')

const VALID_DIRECTUS_TOKEN = 'valid token';
const USER_ID_SAMPLE = 'a user id';

describe('Flag (e2e)', () => {
  let savedEnvAuthBackend: string;

  let app: INestApplication;
  let createdPixel;
  let modifiedPixel;
  let authToken: string;
  let userId: string;

  beforeAll(() => {
    savedEnvAuthBackend = process.env.AUTH_BACKEND;
  });

  afterAll(() => {
    process.env.AUTH_BACKEND = savedEnvAuthBackend;
  });

  for (const authBackend of Object.values(AuthBackend)) {
    describe(`Auth backend: ${authBackend}`, () => {
      beforeAll(async () => {
        process.env.AUTH_BACKEND = authBackend;
        app = await bootstrap(0);

        const dbService = app.get<DatabaseClientService>('DATABASE_CLIENT');
        const db = dbService.getDb();
        await db.collection('users').deleteMany({});
        await db.collection('pixel-events').deleteMany({});

        if (authBackend === AuthBackend.FOULOSCOPIE) {
          authToken = VALID_DIRECTUS_TOKEN;
          userId = USER_ID_SAMPLE;
          jest.spyOn(DirectusModule, 'Directus').mockImplementation(() => ({
            auth: {
              async static(token: AuthToken) {
                return token === VALID_DIRECTUS_TOKEN;
              },
            },
            users: {
              me: {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                async read(query?: QueryOne<UserItem<TypeOf<any, "directus_users">>>): Promise<PartialItem<UserItem<TypeOf<any, "directus_users">>>> {
                  return { id: USER_ID_SAMPLE };
                },
              },
            },
          } as Directus<any>));
        } else if (authBackend === AuthBackend.INTERNAL) {
          const res = await registerAndLogin(app, v4() + '@example.com', 'password123', v4());
          authToken = res.jwt;
          userId = res.user._id;
        }
      });

      afterAll(async () => {
        await app.close();
      });

      it('/pixel (POST)', async () => {
        const res = await request(app.getHttpServer())
          .post('/pixel')
          .set('authorization', authToken)
          .send({
            hexColor: '#FFADAD',
          });
        expect(res.status).toEqual(201);
        createdPixel = res.body;
      });

      it('/pixel (PUT)', async () => {
        const res = await request(app.getHttpServer())
          .put('/pixel')
          .set('authorization', authToken)
          .send({
            pixelId: createdPixel.entityId,
            hexColor: '#DDDDDD',
          });
        expect(res.status).toEqual(200);
        modifiedPixel = res.body;
      });

      it('/pixel (GET)', async () => {
        const res = await request(app.getHttpServer())
          .get('/pixel')
          .set('authorization', authToken);
        const mypixel = res.body;

        expect(res.status).toEqual(200);

        expect(mypixel.author).toEqual(userId);
        expect(mypixel.hexColor).toEqual('#DDDDDD');
        expect(mypixel.createdAt).toEqual(createdPixel.createdAt);
        expect(mypixel.lastUpdate).toEqual(modifiedPixel.createdAt);
      });

      it('/flag (GET)', async () => {
        const res = await request(app.getHttpServer())
          .get('/flag')
          .set('authorization', authToken);
        const firstPixel = res.body[0];

        expect(res.status).toEqual(200);

        expect(firstPixel.author).toEqual(userId);
        expect(firstPixel.hexColor).toEqual('#DDDDDD');
        expect(firstPixel.createdAt).toEqual(createdPixel.createdAt);
        expect(firstPixel.lastUpdate).toEqual(modifiedPixel.createdAt);
      });
    });
  }
});