import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRequiredSections, generateCompactSchedules, meetingsOverlap } from '../src/services/scheduler.js';

const meeting = (dayOfWeek, startTime, endTime) => ({ dayOfWeek, startTime, endTime });

test('detects overlap but permits adjacent classes', () => {
  assert.equal(meetingsOverlap(meeting(2, '07:00', '09:00'), meeting(2, '08:00', '10:00')), true);
  assert.equal(meetingsOverlap(meeting(2, '07:00', '09:00'), meeting(2, '09:00', '11:00')), false);
  assert.equal(meetingsOverlap(meeting(2, '07:00', '09:00'), meeting(3, '08:00', '10:00')), false);
});

test('prefers the schedule with fewer study days', () => {
  const courses = [
    {
      sections: [
        { id: 1, courseCode: 'MT1003', meetings: [meeting(2, '07:00', '09:00')] },
        { id: 2, courseCode: 'MT1003', meetings: [meeting(4, '07:00', '09:00')] },
      ],
    },
    {
      sections: [
        { id: 3, courseCode: 'PH1003', meetings: [meeting(2, '09:00', '11:00')] },
        { id: 4, courseCode: 'PH1003', meetings: [meeting(5, '09:00', '11:00')] },
      ],
    },
  ];

  const result = generateCompactSchedules(courses);
  assert.equal(result.suggestions[0].studyDays, 1);
  assert.deepEqual(result.suggestions[0].sections.map((section) => section.id), [1, 3]);
});

test('uses total gap as the tie breaker', () => {
  const courses = [
    {
      sections: [{ id: 1, courseCode: 'A', meetings: [meeting(2, '07:00', '09:00')] }],
    },
    {
      sections: [
        { id: 2, courseCode: 'B', meetings: [meeting(2, '09:00', '11:00')] },
        { id: 3, courseCode: 'B', meetings: [meeting(2, '13:00', '15:00')] },
      ],
    },
  ];

  const result = generateCompactSchedules(courses);
  assert.equal(result.suggestions[0].gapMinutes, 0);
  assert.equal(result.suggestions[1].gapMinutes, 240);
});

test('filters only the required section for a locked course', () => {
  const courses = [
    {
      code: 'SP1007',
      sections: [
        { id: 1, code: 'L01', meetings: [] },
        { id: 5, code: 'L05', meetings: [] },
      ],
    },
    {
      code: 'CO3001',
      sections: [{ id: 9, code: 'L01', meetings: [] }],
    },
  ];

  const filtered = applyRequiredSections(courses, ['SP1007:L05']);
  assert.deepEqual(filtered[0].sections.map((section) => section.code), ['L05']);
  assert.equal(filtered[1].sections.length, 1);
});

test('stops searching when the configured node limit is reached', () => {
  const courses = Array.from({ length: 5 }, (_, courseIndex) => ({
    sections: Array.from({ length: 5 }, (_, sectionIndex) => ({
      id: courseIndex * 10 + sectionIndex,
      courseCode: `C${courseIndex}`,
      meetings: [meeting(courseIndex + 2, '07:00', '07:50')],
    })),
  }));

  const result = generateCompactSchedules(courses, { maxSearchNodes: 10 });
  assert.equal(result.truncated, true);
  assert.ok(result.inspectedNodes <= 11);
});
