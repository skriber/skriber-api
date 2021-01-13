import { hashSync } from "bcrypt";
import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import Application from "./Application";
import { v4 as uuid4 } from "uuid";

@Entity({
    name: "api_keys"
})
export class ApiKey {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: "public_key",
        unique: true,
        nullable: false
    })
    publicKey: string;

    @Column({
        name: "secret_key_hash",
        nullable: false
    })
    secretKeyHash: string;

    @Column({
        name: "key_prefix",
        nullable: false
    })
    prefix: string;

    @Column({
        name: "deactivated",
        type: "timestamp",
        nullable: true
    })
    deactivated?: Date

    @ManyToOne(() => Application, application => application.keys)
    @JoinColumn({
        name: 'application_id'
    })
    application: Application

    regenerate(secretKey: string = undefined) {
        this.prefix = uuid4().replace(/-/g, "").substr(0, 6);
        this.publicKey = `sk_${this.prefix}:${ uuid4().replace(/-/g, "").substr(0, 16) }`;
        this.secretKeyHash = hashSync(`sk_${this.prefix}:${secretKey ? secretKey : uuid4().replace(/-/g, "") }`, 12);
    }

}
