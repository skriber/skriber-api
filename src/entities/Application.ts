import {Column, Entity, Generated, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {ApiKey} from "./ApiKey";
import {User} from "./User";

@Entity({
    name: 'applications'
})
export class Application {

    @PrimaryGeneratedColumn()
    id: number;

    @Generated("uuid")
    @Column({
        name: "uuid",
        unique: true,
        nullable: false
    })
    uuid: string

    @Column({
        name: "app_name",
        unique: true,
        nullable: false
    })
    appName: string;

    @Column({
        name: "force_tls",
        nullable: false,
        default: false
    })
    forceTls: boolean;

    @Column({
        name: "client_events_enabled",
        nullable: false,
        default: false
    })
    clientEventsEnabled: boolean;

    @Column({
        name: "authorized_connections_enabled",
        nullable: false,
        default: false
    })
    authorizedConnectionsEnabled: boolean;

    @OneToMany(() => ApiKey, key => key.application)
    keys: ApiKey[]

    @ManyToOne(() => User, user => user.applications)
    @JoinColumn({
        name: 'user_id'
    })
    user: User

    toJSON(): object {
        return {
            uuid: this.uuid,
            appName: this.appName
        }
    }

}
