import {Column, Entity, Generated, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Application} from "./Application";

@Entity({
    name: "users"
})
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Generated("uuid")
    @Column({
        name: 'uuid',
        unique: true
    })
    uuid: string;

    @Column({
        name: 'username',
        nullable: false,
        unique: true
    })
    username: string;

    @Column({
        name: 'first_name',
        nullable: false
    })
    firstName: string;

    @Column({
        name: 'last_name',
        nullable: false
    })
    lastName: string;

    @Column({
        name: 'email',
        unique: true,
        nullable: false
    })
    email: string;

    @Column({
        name: 'password_hash',
        nullable: false
    })
    passwordHash: string;

    @OneToMany(() => Application, application => application.user)
    applications: Application[]

    toJSON(): UserJson {
        return {
            uuid: this.uuid,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email
        }
    }

}

export interface UserJson {
    uuid: string,
    firstName: string,
    lastName: string,
    email: string
}
