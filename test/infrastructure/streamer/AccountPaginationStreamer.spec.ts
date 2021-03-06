/*
 * Copyright 2020 NEM
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

import { instance, mock } from 'ts-mockito';
import { AccountPaginationStreamer } from '../../../src/infrastructure/paginationStreamer/AccountPaginationStreamer';
import { PaginationStreamerTestHelper } from './PaginationStreamerTestHelper';
import { AccountRepository } from '../../../src/infrastructure/AccountRepository';

describe('AccountPaginationStreamer', () => {
    it('basicMultiPageTest', () => {
        const accountRepositoryMock: AccountRepository = mock();
        const streamer = new AccountPaginationStreamer(instance(accountRepositoryMock));
        const tester = new PaginationStreamerTestHelper(streamer, mock(), accountRepositoryMock, {});
        return tester.basicMultiPageTest();
    });

    it('basicSinglePageTest', () => {
        const accountRepositoryMock: AccountRepository = mock();
        const streamer = new AccountPaginationStreamer(instance(accountRepositoryMock));
        const tester = new PaginationStreamerTestHelper(streamer, mock(), accountRepositoryMock, {});
        return tester.basicSinglePageTest();
    });

    it('limitToTwoPages', () => {
        const accountRepositoryMock: AccountRepository = mock();
        const streamer = new AccountPaginationStreamer(instance(accountRepositoryMock));
        const tester = new PaginationStreamerTestHelper(streamer, mock(), accountRepositoryMock, {});
        return tester.limitToTwoPages();
    });

    it('multipageWithLimit', () => {
        const accountRepositoryMock: AccountRepository = mock();
        const streamer = new AccountPaginationStreamer(instance(accountRepositoryMock));
        const tester = new PaginationStreamerTestHelper(streamer, mock(), accountRepositoryMock, {});
        return tester.multipageWithLimit();
    });

    it('limitToThreePages', () => {
        const accountRepositoryMock: AccountRepository = mock();
        const streamer = new AccountPaginationStreamer(instance(accountRepositoryMock));
        const tester = new PaginationStreamerTestHelper(streamer, mock(), accountRepositoryMock, {});
        return tester.limitToThreePages();
    });
});
