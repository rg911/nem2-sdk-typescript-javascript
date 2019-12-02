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

import { of } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/operators';
import { Convert } from '../../core/format';
import { UnresolvedMapping } from '../../core/utils/UnresolvedMapping';
import { AmountDto } from '../../infrastructure/catbuffer/AmountDto';
import { EmbeddedMosaicSupplyChangeTransactionBuilder } from '../../infrastructure/catbuffer/EmbeddedMosaicSupplyChangeTransactionBuilder';
import { KeyDto } from '../../infrastructure/catbuffer/KeyDto';
import { MosaicSupplyChangeTransactionBuilder } from '../../infrastructure/catbuffer/MosaicSupplyChangeTransactionBuilder';
import { SignatureDto } from '../../infrastructure/catbuffer/SignatureDto';
import { TimestampDto } from '../../infrastructure/catbuffer/TimestampDto';
import { UnresolvedMosaicIdDto } from '../../infrastructure/catbuffer/UnresolvedMosaicIdDto';
import { ReceiptHttp } from '../../infrastructure/ReceiptHttp';
import { TransactionService } from '../../service/TransactionService';
import { PublicAccount } from '../account/PublicAccount';
import { NetworkType } from '../blockchain/NetworkType';
import { MosaicId } from '../mosaic/MosaicId';
import { MosaicSupplyChangeAction } from '../mosaic/MosaicSupplyChangeAction';
import { NamespaceId } from '../namespace/NamespaceId';
import { ResolutionType } from '../receipt/ResolutionType';
import { UInt64 } from '../UInt64';
import { Deadline } from './Deadline';
import { InnerTransaction } from './InnerTransaction';
import { Transaction } from './Transaction';
import { TransactionInfo } from './TransactionInfo';
import { TransactionType } from './TransactionType';
import { TransactionVersion } from './TransactionVersion';

/**
 * In case a mosaic has the flag 'supplyMutable' set to true, the creator of the mosaic can change the supply,
 * i.e. increase or decrease the supply.
 */
export class MosaicSupplyChangeTransaction extends Transaction {

    /**
     * Create a mosaic supply change transaction object
     * @param deadline - The deadline to include the transaction.
     * @param mosaicId - The unresolved mosaic id.
     * @param action - The supply change action (increase | decrease).
     * @param delta - The supply change in units for the mosaic.
     * @param networkType - The network type.
     * @param maxFee - (Optional) Max fee defined by the sender
     * @returns {MosaicSupplyChangeTransaction}
     */
    public static create(deadline: Deadline,
                         mosaicId: MosaicId | NamespaceId,
                         action: MosaicSupplyChangeAction,
                         delta: UInt64,
                         networkType: NetworkType,
                         maxFee: UInt64 = new UInt64([0, 0])): MosaicSupplyChangeTransaction {
        return new MosaicSupplyChangeTransaction(networkType,
            TransactionVersion.MOSAIC_SUPPLY_CHANGE,
            deadline,
            maxFee,
            mosaicId,
            action,
            delta,
        );
    }

    /**
     * @param networkType
     * @param version
     * @param deadline
     * @param maxFee
     * @param mosaicId
     * @param action
     * @param delta
     * @param signature
     * @param signer
     * @param transactionInfo
     */
    constructor(networkType: NetworkType,
                version: number,
                deadline: Deadline,
                maxFee: UInt64,
                /**
                 * The unresolved mosaic id.
                 */
                public readonly mosaicId: MosaicId | NamespaceId,
                /**
                 * The supply type.
                 */
                public readonly action: MosaicSupplyChangeAction,
                /**
                 * The supply change in units for the mosaic.
                 */
                public readonly delta: UInt64,
                signature?: string,
                signer?: PublicAccount,
                transactionInfo?: TransactionInfo) {
        super(TransactionType.MOSAIC_SUPPLY_CHANGE, networkType, version, deadline, maxFee, signature, signer, transactionInfo);
    }

    /**
     * Create a transaction object from payload
     * @param {string} payload Binary payload
     * @param {Boolean} isEmbedded Is embedded transaction (Default: false)
     * @returns {Transaction | InnerTransaction}
     */
    public static createFromPayload(payload: string,
                                    isEmbedded: boolean = false): Transaction | InnerTransaction {
        const builder = isEmbedded ? EmbeddedMosaicSupplyChangeTransactionBuilder.loadFromBinary(Convert.hexToUint8(payload)) :
            MosaicSupplyChangeTransactionBuilder.loadFromBinary(Convert.hexToUint8(payload));
        const signerPublicKey = Convert.uint8ToHex(builder.getSignerPublicKey().key);
        const networkType = builder.getNetwork().valueOf();
        const transaction = MosaicSupplyChangeTransaction.create(
            isEmbedded ? Deadline.create() : Deadline.createFromDTO(
                (builder as MosaicSupplyChangeTransactionBuilder).getDeadline().timestamp),
            UnresolvedMapping.toUnresolvedMosaic(new UInt64(builder.getMosaicId().unresolvedMosaicId).toHex()),
            builder.getAction().valueOf(),
            new UInt64(builder.getDelta().amount),
            networkType,
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as MosaicSupplyChangeTransactionBuilder).fee.amount),
        );
        return isEmbedded ?
            transaction.toAggregate(PublicAccount.createFromPublicKey(signerPublicKey, networkType)) : transaction;
    }

    /**
     * @override Transaction.size()
     * @description get the byte size of a MosaicSupplyChangeTransaction
     * @returns {number}
     * @memberof MosaicSupplyChangeTransaction
     */
    public get size(): number {
        const byteSize = super.size;

        // set static byte size fields
        const byteMosaicId = 8;
        const byteAction = 1;
        const byteDelta = 8;

        return byteSize + byteMosaicId + byteAction + byteDelta;
    }

    /**
     * @internal
     * @returns {Uint8Array}
     */
    protected generateBytes(): Uint8Array {
        const signerBuffer = new Uint8Array(32);
        const signatureBuffer = new Uint8Array(64);

        const transactionBuilder = new MosaicSupplyChangeTransactionBuilder(
            new SignatureDto(signatureBuffer),
            new KeyDto(signerBuffer),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.MOSAIC_SUPPLY_CHANGE.valueOf(),
            new AmountDto(this.maxFee.toDTO()),
            new TimestampDto(this.deadline.toDTO()),
            new UnresolvedMosaicIdDto(this.mosaicId.id.toDTO()),
            new AmountDto(this.delta.toDTO()),
            this.action.valueOf(),
        );
        return transactionBuilder.serialize();
    }

    /**
     * @internal
     * @returns {Uint8Array}
     */
    protected generateEmbeddedBytes(): Uint8Array {
        const transactionBuilder = new EmbeddedMosaicSupplyChangeTransactionBuilder(
            new KeyDto(Convert.hexToUint8(this.signer!.publicKey)),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.MOSAIC_SUPPLY_CHANGE.valueOf(),
            new UnresolvedMosaicIdDto(this.mosaicId.id.toDTO()),
            new AmountDto(this.delta.toDTO()),
            this.action.valueOf(),
        );
        return transactionBuilder.serialize();
    }

    /**
     * @internal
     * @param receiptHttp ReceiptHttp
     * @param aggregateTransactionIndex Transaction index for aggregated transaction
     * @returns {Observable<MosaicSupplyChangeTransaction>}
     */
    resolveAliases(receiptHttp: ReceiptHttp, aggregateTransactionIndex?: number): Observable<MosaicSupplyChangeTransaction> {
        const hasUnresolved = this.mosaicId instanceof NamespaceId;

        if (!hasUnresolved) {
            return of(this);
        }

        const transactionInfo = this.checkTransactionHeightAndIndex();

        const statementObservable = receiptHttp.getBlockReceipts(transactionInfo.height.toString());

        return statementObservable.pipe(
            map((statement) => {
                    return new MosaicSupplyChangeTransaction(
                        this.networkType,
                        this.version,
                        this.deadline,
                        this.maxFee,
                        TransactionService.getResolvedFromReceipt(ResolutionType.Mosaic, this.mosaicId as NamespaceId,
                            statement, transactionInfo.index, transactionInfo.height.toString(), aggregateTransactionIndex) as MosaicId,
                        this.action,
                        this.delta,
                        this.signature,
                        this.signer,
                        this.transactionInfo,
                    );
                }),
        );
    }
}
