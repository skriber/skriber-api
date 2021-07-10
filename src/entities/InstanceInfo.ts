import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity({
    name: "instance_info"
})
export class InstanceInfo {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'baseurl',
        nullable: false
    })
    baseurl: string;

    @Column({
        name: 'max_payload_size',
        nullable: false
    })
    maxPayloadSize: number;

    @Column({
        name: 'setup_complete',
        nullable: false,
        default: false
    })
    setupComplete: boolean;

}
