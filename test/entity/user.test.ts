import { User, UserJson } from '../../src/entities';

describe('User', () => {
    test('json conversion', () => {
        const user: User = new User();
        user.id = 1;
        user.uuid = "12345";
        user.email = 'td@jkdv.de';
        user.firstName = 'Tobias';
        user.lastName = 'Dittmann';
        user.passwordHash = 'hashedPW';

        const json: UserJson = user.toJSON();

        expect(json.uuid).toBe(user.uuid);
        expect(json.email).toBe(user.email);
        expect(json.firstName).toBe(user.firstName);
        expect(json.lastName).toBe(user.lastName);
    })
})