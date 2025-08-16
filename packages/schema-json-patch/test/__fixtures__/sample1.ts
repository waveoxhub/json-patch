import { Schema } from '../../src/types';

export const testSchema: Schema = {
    $type: 'array',
    $item: {
        $type: 'object',
        $pk: 'id',
        $fields: {
            description: { $type: 'string' },
            enabled: { $type: 'boolean' },
            id: { $type: 'string' },
            name: { $type: 'string' },
            replaceRules: {
                $type: 'array',
                $item: {
                    $type: 'object',
                    $pk: 'id',
                    $fields: {
                        id: { $type: 'string' },
                        reg: { $type: 'string' },
                        replace: { $type: 'string' },
                        type: { $type: 'string' },
                    },
                },
            },
            selectors: {
                $type: 'array',
                $item: { $type: 'string' },
            },
        },
    },
};
export const sampleJsonA = `[
  {
      "description": "",
      "enabled": true,
      "id": "id_rsKW5kltWYSRz1TRf5W7f",
      "name": "menu-list-container",
      "replaceRules": [
          {
              "id": "id_VK9vI_SLwKCH01unnmAd1",
              "reg": "^\\\\s*Home\\\\s*$",
              "replace": "主页",
              "type": "regex"
          },
          {
              "id": "id_DqPuVJe7lX0GyWvbBPCWL",
              "reg": "^\\\\s*Top\\\\s*$",
              "replace": "热门",
              "type": "regex"
          }
      ],
      "selectors": [
          ".menu-list-container"
      ]
  },
  {
      "description": "",
      "enabled": true,
      "id": "id_yDw1a7QWI9Xd2eSsicOnu",
      "name": ".caption.titled",
      "replaceRules": [
          {
              "id": "id_2EJWGUk3oNG8vnn258Rbz",
              "reg": "^\\\\s*→ Pay attention\\\\s*$",
              "replace": "→ 注意",
              "type": "regex"
          },
          {
              "id": "id_0BLLIdbgk9r0AodgfwwUP",
              "reg": "^\\\\s*→ Top rated\\\\s*$",
              "replace": "→ 评级排行",
              "type": "regex"
          },
          {
              "id": "id_Zvrg6i5b_2kC_N2Urubdy",
              "reg": "^\\\\s*→ Top contributors\\\\s*$",
              "replace": "→ 贡献者排行",
              "type": "regex"
          }
      ],
      "selectors": [
          ".caption.titled"
      ]
  }
]`;

export const sampleJsonB = `[
  {
      "description": "",
      "enabled": true,
      "id": "id_rsKW5kltWYSRz1TRf5W7f",
      "name": "menu-list-container",
      "replaceRules": [
          {
              "id": "id_VK9vI_SLwKCH01unnmAd1",
              "reg": "^\\\\s*Home\\\\s*$",
              "replace": "主页",
              "type": "regex"
          },
          {
              "id": "id_DqPuVJe7lX0GyWvbBPCWL",
              "reg": "^\\\\s*Top\\\\s*$",
              "replace": "最热",
              "type": "regex"
          }
      ],
      "selectors": [
          ".menu-list-container"
      ]
  },
  {
      "description": "",
      "enabled": true,
      "id": "id_yDw1a7QWI9Xd2eSsicOnu",
      "name": ".caption.titled",
      "replaceRules": [
          {
              "id": "id_2EJWGUk3oNG8vnn258Rbz",
              "reg": "^\\\\s*→ Pay attention\\\\s*$",
              "replace": "注意",
              "type": "regex"
          },
          {
              "id": "id_0BLLIdbgk9r0AodgfwwUP",
              "reg": "^\\\\s*→ Top rated\\\\s*$",
              "replace": "评级排行",
              "type": "regex"
          },
          {
              "id": "id_Zvrg6i5b_2kC_N2Urubdy",
              "reg": "^\\\\s*→ Top contributors\\\\s*$",
              "replace": "→ 贡献者排行",
              "type": "regex"
          }
      ],
      "selectors": [
          ".caption.titled"
      ]
  }
]`;

export const sampleJsonC = `[
  {
      "description": "",
      "enabled": true,
      "id": "id_rsKW5kltWYSRz1TRf5W7f",
      "name": "menu-list-container",
      "replaceRules": [
          {
              "id": "id_VK9vI_SLwKCH01unnmAd1",
              "reg": "^\\\\s*Home\\\\s*$",
              "replace": "主页",
              "type": "regex"
          },
          {
              "id": "id_DqPuVJe7lX0GyWvbBPCWL",
              "reg": "^\\\\s*Top\\\\s*$",
              "replace": "热门",
              "type": "regex"
          }
      ],
      "selectors": [
          ".menu-list-container"
      ]
  },
  {
      "description": "",
      "enabled": true,
      "id": "id_yDw1a7QWI9Xd2eSsicOnu",
      "name": ".caption.titled",
      "replaceRules": [
          {
              "id": "id_0BLLIdbgk9r0AodgfwwUP",
              "reg": "^\\\\s*→ Top rated\\\\s*$",
              "replace": "→ 评级排行",
              "type": "regex"
          },
          {
              "id": "id_Zvrg6i5b_2kC_N2Urubdy",
              "reg": "^\\\\s*→ Top contributors\\\\s*$",
              "replace": "贡献者排行",
              "type": "regex"
          }
      ],
      "selectors": [
          ".caption.titled"
      ]
  }
]`;

export const sampleJsonD = `[
{
  "description": "菜单栏翻译",
  "enabled": true,
  "id": "id_rsKW5kltWYSRz1TRf5W7f",
  "name": "menu-list-container",
  "replaceRules": [
    {
      "id": "id_VK9vI_SLwKCH01unnmAd1",
      "reg": "^\\\\s*Home\\\\s*$",
      "replace": "主页",
      "type": "regex"
    },
    {
      "id": "id_DqPuVJe7lX0GyWvbBPCWL",
      "reg": "^\\\\s*Top\\\\s*$",
      "replace": "热门",
      "type": "regex"
    },
    {
      "id": "id_NEW5",
      "reg": "^\\\\s*Contests\\\\s*$",
      "replace": "比赛",
      "type": "regex"
    },
    {
      "id": "id_NEW6",
      "reg": "^\\\\s*Problemset\\\\s*$",
      "replace": "题库",
      "type": "regex"
    }
  ],
  "selectors": [
    ".menu-list-container"
  ]
},
{
  "description": "",
  "enabled": true,
  "id": "id_yDw1a7QWI9Xd2eSsicOnu",
  "name": ".caption.titled",
  "replaceRules": [
    {
      "id": "id_0BLLIdbgk9r0AodgfwwUP",
      "reg": "^\\\\s*→ Top rated\\\\s*$",
      "replace": "→ rating排行榜",
      "type": "regex"
    },
    {
      "id": "id_Zvrg6i5b_2kC_N2Urubdy",
      "reg": "^\\\\s*→ Top contributors\\\\s*$",
      "replace": "→ 贡献者排行榜",
      "type": "regex"
    },
    {
      "id": "id_UUPCO6M3WHahEevFVFh54",
      "reg": "^\\\\s*→ Find user\\\\s*$",
      "replace": "→ 查找用户",
      "type": "regex"
    }
  ],
  "selectors": [
    ".caption.titled"
  ]
}
]`;
