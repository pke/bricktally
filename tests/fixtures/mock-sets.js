/**
 * Mock LEGO® set data for testing
 * These are synthetic sets designed for specific test scenarios
 */

export const mockSets = {
  // TEST-001: Basic set with parts only (no minifigs, no spares)
  'TEST-001': {
    setNumber: '99001-1',
    setName: 'Basic Parts Set',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 10,
    parts: [
      {
        id: 'part_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      },
      {
        id: 'part_2',
        element_id: '300423',
        part: { part_num: '3004', name: 'Brick 1x2' },
        color: { id: 11, name: 'Blue' },
        quantity: 3,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300423.jpg'
      },
      {
        id: 'part_3',
        element_id: '300526',
        part: { part_num: '3005', name: 'Brick 1x1' },
        color: { id: 6, name: 'Green' },
        quantity: 2,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300526.jpg'
      }
    ],
    minifigs: []
  },

  // TEST-002: Set with minifigures
  'TEST-002': {
    setNumber: '99002-1',
    setName: 'Set with Minifigures',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 12,
    parts: [
      {
        id: 'part_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      },
      {
        id: 'part_2',
        element_id: '300423',
        part: { part_num: '3004', name: 'Brick 1x2' },
        color: { id: 11, name: 'Blue' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300423.jpg'
      }
    ],
    minifigs: [
      {
        fig_num: 'fig-001234',
        name: 'Police Officer',
        quantity: 1,
        set_img_url: 'https://cdn.rebrickable.com/media/sets/fig-001234.jpg',
        num_parts: 5
      },
      {
        fig_num: 'fig-005678',
        name: 'Firefighter',
        quantity: 1,
        set_img_url: 'https://cdn.rebrickable.com/media/sets/fig-005678.jpg',
        num_parts: 6
      }
    ]
  },

  // TEST-003: Set with spare parts
  'TEST-003': {
    setNumber: '99003-1',
    setName: 'Set with Spare Parts',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 10,
    parts: [
      {
        id: 'part_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      },
      {
        id: 'part_2',
        element_id: '300423',
        part: { part_num: '3004', name: 'Brick 1x2' },
        color: { id: 11, name: 'Blue' },
        quantity: 3,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300423.jpg'
      },
      {
        id: 'part_3',
        element_id: '300526',
        part: { part_num: '3005', name: 'Brick 1x1' },
        color: { id: 6, name: 'Green' },
        quantity: 2,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300526.jpg'
      },
      // Spare parts
      {
        id: 'spare_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 2,
        is_spare: true,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      },
      {
        id: 'spare_2',
        element_id: '300423',
        part: { part_num: '3004', name: 'Brick 1x2' },
        color: { id: 11, name: 'Blue' },
        quantity: 1,
        is_spare: true,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300423.jpg'
      }
    ],
    minifigs: []
  },

  // TEST-004: Set with everything (parts, minifigs, spares)
  'TEST-004': {
    setNumber: '99004-1',
    setName: 'Complete Test Set',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 12,
    parts: [
      {
        id: 'part_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      },
      {
        id: 'part_2',
        element_id: '300423',
        part: { part_num: '3004', name: 'Brick 1x2' },
        color: { id: 11, name: 'Blue' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300423.jpg'
      },
      // Spare parts
      {
        id: 'spare_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 3,
        is_spare: true,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      }
    ],
    minifigs: [
      {
        fig_num: 'fig-001234',
        name: 'Police Officer',
        quantity: 2,
        set_img_url: 'https://cdn.rebrickable.com/media/sets/fig-001234.jpg',
        num_parts: 5
      }
    ]
  },

  // TEST-005: Large set for rounding tests (294 parts)
  'TEST-005': {
    setNumber: '99005-1',
    setName: 'Rounding Test Set',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 294,
    parts: [
      {
        id: 'part_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 294,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      }
    ],
    minifigs: []
  },

  // TEST-006: Empty set (edge case)
  'TEST-006': {
    setNumber: '99006-1',
    setName: 'Empty Set',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 0,
    parts: [],
    minifigs: []
  },

  // TEST-007: Multiple colors for filter testing
  'TEST-007': {
    setNumber: '99007-1',
    setName: 'Color Filter Test Set',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 15,
    parts: [
      {
        id: 'part_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      },
      {
        id: 'part_2',
        element_id: '300423',
        part: { part_num: '3004', name: 'Brick 1x2' },
        color: { id: 11, name: 'Blue' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300423.jpg'
      },
      {
        id: 'part_3',
        element_id: '300526',
        part: { part_num: '3005', name: 'Brick 1x1' },
        color: { id: 6, name: 'Green' },
        quantity: 5,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300526.jpg'
      }
    ],
    minifigs: []
  },

  // TEST-008: Multi-version test set (version 1)
  'TEST-008': {
    setNumber: '99008',
    setName: 'Multi-Version Test Set',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2024,
    theme: 'Test',
    numParts: 15,
    parts: [
      {
        id: 'part_1',
        element_id: '300121',
        part: { part_num: '3001', name: 'Brick 2x4' },
        color: { id: 5, name: 'Red' },
        quantity: 8,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300121.jpg'
      },
      {
        id: 'part_2',
        element_id: '300223',
        part: { part_num: '3002', name: 'Brick 2x3' },
        color: { id: 11, name: 'Blue' },
        quantity: 7,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300223.jpg'
      }
    ],
    minifigs: []
  },

  // TEST-008-ALT: Multi-version test set (version 2 / alternate)
  'TEST-008-ALT': {
    setNumber: '99008',
    setName: 'Multi-Version Test Set (Alternate)',
    setImageUrl: '/assets/test-placeholder.png',
    year: 2025,
    theme: 'Test',
    numParts: 20,
    parts: [
      {
        id: 'part_1',
        element_id: '300326',
        part: { part_num: '3003', name: 'Brick 2x2' },
        color: { id: 6, name: 'Green' },
        quantity: 10,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300326.jpg'
      },
      {
        id: 'part_2',
        element_id: '300414',
        part: { part_num: '3004', name: 'Brick 1x2' },
        color: { id: 14, name: 'Yellow' },
        quantity: 10,
        is_spare: false,
        part_img_url: 'https://cdn.rebrickable.com/media/parts/elements/300414.jpg'
      }
    ],
    minifigs: []
  }
};

/**
 * Helper to convert mock API response to the format expected by the app
 * @param {Object} mockSet - The mock set data
 * @param {string} setNumOverride - Optional override for set_num (e.g., '99008-1' for version specification)
 */
export function convertMockSetToAPIResponse(mockSet, setNumOverride = null) {
  const baseNumber = mockSet.setNumber;
  const fullSetNum = setNumOverride || (baseNumber.includes('-') ? baseNumber : `${baseNumber}-1`);

  return {
    set_num: fullSetNum,
    name: mockSet.setName,
    year: mockSet.year,
    theme_id: 1,
    num_parts: mockSet.numParts,
    set_img_url: mockSet.setImageUrl,
    set_url: `https://rebrickable.com/sets/${fullSetNum}/`,
    last_modified_dt: new Date().toISOString()
  };
}

/**
 * Helper to convert parts list to API response format
 */
export function convertPartsToAPIResponse(parts, page = 1) {
  const pageSize = 100;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageParts = parts.slice(start, end);

  return {
    count: parts.length,
    next: end < parts.length ? `/api/mock?page=${page + 1}` : null,
    previous: page > 1 ? `/api/mock?page=${page - 1}` : null,
    results: pageParts
  };
}

/**
 * Helper to convert minifigs to API response format
 */
export function convertMinifogsToAPIResponse(minifigs) {
  return {
    count: minifigs.length,
    next: null,
    previous: null,
    results: minifigs.map((minifig, index) => ({
      id: index + 2, // Start from 2 to avoid conflicts with parts (parts are 0, 1, ...)
      set_num: minifig.fig_num,
      set_name: minifig.name,
      quantity: minifig.quantity,
      set_img_url: minifig.set_img_url,
      num_parts: minifig.num_parts
    }))
  };
}
