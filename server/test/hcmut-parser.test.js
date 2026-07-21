import test from 'node:test';
import assert from 'node:assert/strict';
import { isImportableSection, parseHcmutRegistration } from '../../client/src/utils/hcmutParser.js';

const DATABASE_FIXTURE = `
ĐĂNG KÝ MÔN HỌC
ĐĂNG KÝ/ HIỆU CHỈNH (HK261_D2)
Chọn môn học đăng ký
co2013
CO2013 - Hệ cơ sở dữ liệu
Nhóm lớp\tDK/ Sĩ số\tNgôn ngữ\tNhóm LT\tGiảng viên\tNhóm BT\tGiảng viên BT/TN\tSĩ số LT\t#
A01_A01\t30/40\tV\tA01\t\tA01\t\t80
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - - - - - - - 10 11 12 - - - -\tC4-501\t1\t\t1234567
L01_L01\t25/40\tV\tL01\t\tL01\t\t80
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - - - 10 11 12 - - - -\tH6-109\t2\t\t1234567
Thứ 4\t- 2 3 4 5 6 - - - - - - - - - -\tH6-703\t2\t\t1234567
L03_L06\t40/40\tV\tL03\t\tL06\t\t80
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - - - - - 8 9 10 11 12 - - - -\tH6-702\t2\t\t1234567
L05_L09\t40/40\tV\tL05\t\tL09\t\t80
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - 4 5 6 - - - - - - - - - -\tH2-407\t2\t\t1234567
Thứ 3\t- 2 3 4 5 6 - - - - - - - - - -\tH6-702\t2\t\t1234567
Phiếu đăng ký
Danh sách đã đăng ký
1CO2013 - Hệ cơ sở dữ liệu4.0
Nhóm lớp\tDK/ Sĩ số\tNgôn ngữ\tNhóm LT\tGiảng viên\tNhóm BT\tGiảng viên BT/TN\tSĩ số LT\t#
L05_L09\t38/40\tV\tL05\t\tL09\t\t80
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - 4 5 6 - - - - - - - - - -\tH2-407\t2\t\t1234567
Thứ 3\t- 2 3 4 5 6 - - - - - - - - - -\tH6-702\t2\t\t1234567
2CO3103 - Đồ án tổng hợp1.0
L01\t113/150\tV\tL01\t"Chưa/Đang phân công"\t\t\t150
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Chưa biết\t--\t------\t2\t\t1234567
Tổng số tín chỉ đăng ký: 5.0
`;

const NETWORK_FIXTURE = `
ĐĂNG KÝ/ HIỆU CHỈNH (HK261_D2)
Chọn môn học đăng ký
co3093
CO3093 - Mạng máy tính
Nhóm lớp\tDK/ Sĩ số\tNgôn ngữ\tNhóm LT\tGiảng viên\tNhóm BT\tGiảng viên BT/TN\tSĩ số LT\t#
CC01_CC01\t37/40\tTA\tCC01\t\tCC01\t\t80
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 4\t- - - - - - - - 9 10 - - - - - -\tB1-208\t1\t\t1234567
L03_L08\t40/40\tV\tL03\t\tL08\t\t120
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - - - - - 8 9 10 11 12 - - - -\tH6-604\t2\t\t1234567
Thứ 3\t- - - - - - - 8 9 - - - - - - -\tH1-101\t2\t\t1234567
Phiếu đăng ký
Danh sách đã đăng ký
1CO3093 - Mạng máy tính3.0
L03_L08\t38/40\tV\tL03\t\tL08\t\t120
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - - - - - 8 9 10 11 12 - - - -\tH6-604\t2\t\t1234567
Thứ 3\t- - - - - - - 8 9 - - - - - - -\tH1-101\t2\t\t1234567
Tổng số tín chỉ đăng ký: 3.0
`;

test('parses queried database sections and converts periods to time', () => {
  const result = parseHcmutRegistration(DATABASE_FIXTURE);
  assert.equal(result.semester, 'HK261');
  assert.equal(result.queriedCourse.code, 'CO2013');
  assert.equal(result.queriedCourse.sections.length, 4);
  assert.equal(result.suggestedLanguage, 'V');
  assert.equal(result.suggestedCampus, 2);

  const section = result.queriedCourse.sections.find((item) => item.code === 'L01_L01');
  assert.deepEqual(section.meetings.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })), [
    { dayOfWeek: 3, startTime: '15:00', endTime: '17:50' },
    { dayOfWeek: 4, startTime: '07:00', endTime: '11:50' },
  ]);
});

test('excludes a full candidate unless it is already registered', () => {
  const result = parseHcmutRegistration(DATABASE_FIXTURE);
  const fullCandidate = result.queriedCourse.sections.find((item) => item.code === 'L03_L06');
  const registeredCandidate = result.queriedCourse.sections.find((item) => item.code === 'L05_L09');

  assert.equal(fullCandidate.isFull, true);
  assert.equal(isImportableSection(fullCandidate), false);
  assert.equal(registeredCandidate.isFull, true);
  assert.equal(registeredCandidate.alreadyRegistered, true);
  assert.equal(isImportableSection(registeredCandidate), true);
  assert.match(result.warnings.join(' '), /CO3103 · L01: chưa có lịch học/);
});

test('parses the network sample and infers filters from the registered section', () => {
  const result = parseHcmutRegistration(NETWORK_FIXTURE);
  const section = result.queriedCourse.sections.find((item) => item.code === 'L03_L08');
  assert.equal(result.queriedCourse.code, 'CO3093');
  assert.equal(result.suggestedLanguage, 'V');
  assert.equal(result.suggestedCampus, 2);
  assert.equal(section.alreadyRegistered, true);
  assert.deepEqual(section.meetings.map(({ dayOfWeek, startPeriod, endPeriod }) => ({ dayOfWeek, startPeriod, endPeriod })), [
    { dayOfWeek: 2, startPeriod: 8, endPeriod: 12 },
    { dayOfWeek: 3, startPeriod: 8, endPeriod: 9 },
  ]);
});
