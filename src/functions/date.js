/**
 * This file is part of Special Order Manager.
 *
 * NOTICE: All information contained herein is, and remains the property of
 * Walnut Creek Hardware Inc and its suppliers, if any. The intellectual and
 * technical concepts contained herein are proprietary to Walnut Creek Hardware
 * Inc and its suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material is
 * strictly forbidden unless prior written permission is obtained.
 *
 * @author Grant Martin <commgdog@gmail.com>
 * @copyright 2021 Walnut Creek Hardware Inc.
 */

import store from '@/store';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault(store.state.session.user.timezone);

export default (format, unix) => dayjs.tz(dayjs.unix(unix)).format(format);
