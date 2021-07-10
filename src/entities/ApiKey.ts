import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Application} from "./Application";
import {v4 as uuid4} from "uuid";

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
        name: "secret_key",
        unique: true,
        nullable: false
    })
    secretKey: string;

    @Column({
        name: "deactivated",
        type: "timestamp",
        nullable: true
    })
    deactivated?: Date

    @ManyToOne(() => Application, application => application.keys, {eager: true, onDelete: "CASCADE"})
    @JoinColumn({
        name: 'application_id'
    })
    application: Application

    regenerate() {
        this.publicKey = `sk_${ uuid4().replace(/-/g, "").substr(0, 16) }`;
        this.secretKey = `sk_${ uuid4().replace(/-/g, "").substr(0, 16) }`;
    }

}
