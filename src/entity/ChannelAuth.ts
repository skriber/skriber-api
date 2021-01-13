import {Column, Entity, Generated, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import Application from "./Application";

@Entity()
export default class ChannelAuth {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Application, application => application.authorizedChannels)
    @JoinColumn({
        name: 'application_id'
    })
    application: Application

    @Column({
        name: 'socket_name'
    })
    socket: string

    @Column({
        name: 'channel_name'
    })
    channel: string

}
