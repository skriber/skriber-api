import {Entity, PrimaryGeneratedColumn, Column, Generated, ManyToOne, OneToMany, JoinColumn} from "typeorm";
import { ApiKey } from "./ApiKey";
import ChannelAuth from "./ChannelAuth";
import User from "./User";

@Entity({
    name: 'applications'
})
export default class Application {

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

    @OneToMany(() => ApiKey, key => key.application)
    keys: ApiKey[]

    @ManyToOne(() => User, user => user.applications)
    @JoinColumn({
        name: 'user_id'
    })
    user: User

    @OneToMany(() => ChannelAuth, channelAuth => channelAuth.application)
    authorizedChannels: ChannelAuth[]

    toJSON(): object {
        return {
            uuid: this.uuid,
            appName: this.appName
        }
    }

}