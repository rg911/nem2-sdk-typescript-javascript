/*
 * Copyright 2018 NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
    AmountDto,
    BlockDurationDto,
    EmbeddedSecretLockTransactionBuilder,
    EmbeddedTransactionBuilder,
    Hash256Dto,
    KeyDto,
    SecretLockTransactionBuilder,
    SignatureDto,
    TimestampDto,
    UnresolvedAddressDto,
    UnresolvedMosaicBuilder,
    UnresolvedMosaicIdDto,
    TransactionBuilder,
} from 'catbuffer-typescript';
import { Convert, Convert as convert } from '../../core/format';
import { DtoMapping } from '../../core/utils/DtoMapping';
import { UnresolvedMapping } from '../../core/utils/UnresolvedMapping';
import { Address } from '../account/Address';
import { PublicAccount } from '../account/PublicAccount';
import { Mosaic } from '../mosaic/Mosaic';
import { NamespaceId } from '../namespace/NamespaceId';
import { NetworkType } from '../network/NetworkType';
import { Statement } from '../receipt/Statement';
import { UInt64 } from '../UInt64';
import { Deadline } from './Deadline';
import { LockHashAlgorithmLengthValidator, LockHashAlgorithm } from './LockHashAlgorithm';
import { InnerTransaction } from './InnerTransaction';
import { Transaction } from './Transaction';
import { TransactionInfo } from './TransactionInfo';
import { TransactionType } from './TransactionType';
import { TransactionVersion } from './TransactionVersion';
import { UnresolvedAddress } from '../account/UnresolvedAddress';

export class SecretLockTransaction extends Transaction {
    /**
     * Create a secret lock transaction object.
     *
     * @param deadline - The deadline to include the transaction.
     * @param mosaic - The locked mosaic.
     * @param duration - The funds lock duration.
     * @param hashAlgorithm - The hash algorithm secret is generated with.
     * @param secret - The proof hashed.
     * @param recipientAddress - The unresolved recipient address of the funds.
     * @param networkType - The network type.
     * @param maxFee - (Optional) Max fee defined by the sender
     * @param signature - (Optional) Transaction signature
     * @param signer - (Optional) Signer public account
     * @return a SecretLockTransaction instance
     */
    public static create(
        deadline: Deadline,
        mosaic: Mosaic,
        duration: UInt64,
        hashAlgorithm: LockHashAlgorithm,
        secret: string,
        recipientAddress: UnresolvedAddress,
        networkType: NetworkType,
        maxFee: UInt64 = new UInt64([0, 0]),
        signature?: string,
        signer?: PublicAccount,
    ): SecretLockTransaction {
        return new SecretLockTransaction(
            networkType,
            TransactionVersion.SECRET_LOCK,
            deadline,
            maxFee,
            mosaic,
            duration,
            hashAlgorithm,
            secret,
            recipientAddress,
            signature,
            signer,
        );
    }

    /**
     * @param networkType
     * @param version
     * @param deadline
     * @param maxFee
     * @param mosaic
     * @param duration
     * @param hashAlgorithm
     * @param secret
     * @param recipientAddress
     * @param signature
     * @param signer
     * @param transactionInfo
     */
    constructor(
        networkType: NetworkType,
        version: number,
        deadline: Deadline,
        maxFee: UInt64,
        /**
         * The locked mosaic.
         */
        public readonly mosaic: Mosaic,
        /**
         * The duration for the funds to be released or returned.
         */
        public readonly duration: UInt64,
        /**
         * The hash algorithm, secret is generated with.
         */
        public readonly hashAlgorithm: LockHashAlgorithm,
        /**
         * The proof hashed.
         */
        public readonly secret: string,
        /**
         * The unresolved recipientAddress of the funds.
         */
        public readonly recipientAddress: UnresolvedAddress,
        signature?: string,
        signer?: PublicAccount,
        transactionInfo?: TransactionInfo,
    ) {
        super(TransactionType.SECRET_LOCK, networkType, version, deadline, maxFee, signature, signer, transactionInfo);
        if (!LockHashAlgorithmLengthValidator(hashAlgorithm, this.secret)) {
            throw new Error('HashAlgorithm and Secret have incompatible length or not hexadecimal string');
        }
    }

    /**
     * Create a transaction object from payload
     * @param {string} payload Binary payload
     * @param {Boolean} isEmbedded Is embedded transaction (Default: false)
     * @returns {Transaction | InnerTransaction}
     */
    public static createFromPayload(payload: string, isEmbedded = false): Transaction | InnerTransaction {
        const builder = isEmbedded
            ? EmbeddedSecretLockTransactionBuilder.loadFromBinary(Convert.hexToUint8(payload))
            : SecretLockTransactionBuilder.loadFromBinary(Convert.hexToUint8(payload));
        const signerPublicKey = Convert.uint8ToHex(builder.getSignerPublicKey().key);
        const networkType = builder.getNetwork().valueOf();
        const signature = payload.substring(16, 144);
        const transaction = SecretLockTransaction.create(
            isEmbedded ? Deadline.create() : Deadline.createFromDTO((builder as SecretLockTransactionBuilder).getDeadline().timestamp),
            new Mosaic(
                UnresolvedMapping.toUnresolvedMosaic(new UInt64(builder.getMosaic().mosaicId.unresolvedMosaicId).toHex()),
                new UInt64(builder.getMosaic().amount.amount),
            ),
            new UInt64(builder.getDuration().blockDuration),
            builder.getHashAlgorithm().valueOf(),
            Convert.uint8ToHex(builder.getSecret().hash256),
            UnresolvedMapping.toUnresolvedAddress(Convert.uint8ToHex(builder.getRecipientAddress().unresolvedAddress)),
            networkType,
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as SecretLockTransactionBuilder).fee.amount),
            isEmbedded || signature.match(`^[0]+$`) ? undefined : signature,
            signerPublicKey.match(`^[0]+$`) ? undefined : PublicAccount.createFromPublicKey(signerPublicKey, networkType),
        );
        return isEmbedded ? transaction.toAggregate(PublicAccount.createFromPublicKey(signerPublicKey, networkType)) : transaction;
    }

    /**
     * @description Get secret bytes
     * @returns {Uint8Array}
     * @memberof SecretLockTransaction
     */
    public getSecretByte(): Uint8Array {
        return convert.hexToUint8(64 > this.secret.length ? this.secret + '0'.repeat(64 - this.secret.length) : this.secret);
    }

    /**
     * @internal
     * @returns {TransactionBuilder}
     */
    protected createBuilder(): TransactionBuilder {
        const signerBuffer = this.signer !== undefined ? Convert.hexToUint8(this.signer.publicKey) : new Uint8Array(32);
        const signatureBuffer = this.signature !== undefined ? Convert.hexToUint8(this.signature) : new Uint8Array(64);

        const transactionBuilder = new SecretLockTransactionBuilder(
            new SignatureDto(signatureBuffer),
            new KeyDto(signerBuffer),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.SECRET_LOCK.valueOf(),
            new AmountDto(this.maxFee.toDTO()),
            new TimestampDto(this.deadline.toDTO()),
            new UnresolvedAddressDto(this.recipientAddress.encodeUnresolvedAddress(this.networkType)),
            new Hash256Dto(this.getSecretByte()),
            new UnresolvedMosaicBuilder(new UnresolvedMosaicIdDto(this.mosaic.id.id.toDTO()), new AmountDto(this.mosaic.amount.toDTO())),
            new BlockDurationDto(this.duration.toDTO()),
            this.hashAlgorithm.valueOf(),
        );
        return transactionBuilder;
    }

    /**
     * @internal
     * @returns {EmbeddedTransactionBuilder}
     */
    public toEmbeddedTransaction(): EmbeddedTransactionBuilder {
        return new EmbeddedSecretLockTransactionBuilder(
            new KeyDto(convert.hexToUint8(this.signer!.publicKey)),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.SECRET_LOCK.valueOf(),
            new UnresolvedAddressDto(this.recipientAddress.encodeUnresolvedAddress(this.networkType)),
            new Hash256Dto(this.getSecretByte()),
            new UnresolvedMosaicBuilder(new UnresolvedMosaicIdDto(this.mosaic.id.id.toDTO()), new AmountDto(this.mosaic.amount.toDTO())),
            new BlockDurationDto(this.duration.toDTO()),
            this.hashAlgorithm.valueOf(),
        );
    }

    /**
     * @internal
     * @param statement Block receipt statement
     * @param aggregateTransactionIndex Transaction index for aggregated transaction
     * @returns {SecretLockTransaction}
     */
    resolveAliases(statement: Statement, aggregateTransactionIndex = 0): SecretLockTransaction {
        const transactionInfo = this.checkTransactionHeightAndIndex();
        return DtoMapping.assign(this, {
            recipientAddress: statement.resolveAddress(
                this.recipientAddress,
                transactionInfo.height.toString(),
                transactionInfo.index,
                aggregateTransactionIndex,
            ),
            mosaic: statement.resolveMosaic(
                this.mosaic,
                transactionInfo.height.toString(),
                transactionInfo.index,
                aggregateTransactionIndex,
            ),
        });
    }

    /**
     * @internal
     * Check a given address should be notified in websocket channels
     * @param address address to be notified
     * @param alias address alias (names)
     * @returns {boolean}
     */
    public shouldNotifyAccount(address: Address, alias: NamespaceId[]): boolean {
        return (
            super.isSigned(address) ||
            this.recipientAddress.equals(address) ||
            alias.find((name) => this.recipientAddress.equals(name)) !== undefined
        );
    }
}
