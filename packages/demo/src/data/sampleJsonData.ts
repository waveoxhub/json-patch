import { Schema } from '@waveox/schema-json-patch';

export const original = `[
  {
    "id": "contact-1",
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "tags": ["同事", "技术部"],
    "address": "北京市海淀区"
  },
  {
    "id": "contact-2",
    "name": "李四",
    "phone": "13900139000",
    "email": "lisi@example.com",
    "tags": ["客户"],
    "address": "上海市浦东新区"
  },
  {
    "id": "contact-3",
    "name": "王五",
    "phone": "13700137000",
    "email": "wangwu@example.com",
    "tags": ["朋友"],
    "address": "广州市天河区"
  }
]`;

export const version1 = `[
  {
    "id": "contact-1",
    "name": "张三",
    "phone": "13888888888",
    "email": "zhangsan@example.com",
    "tags": ["同事", "技术部"],
    "address": "北京市海淀区中关村大街"
  },
  {
    "id": "contact-2",
    "name": "李四",
    "phone": "13900139001",
    "email": "lisi@example.com",
    "tags": ["客户"],
    "address": "上海市浦东新区"
  }
]`;

export const version2 = `[
  {
    "id": "contact-1",
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@newemail.com",
    "tags": ["同事", "技术部", "项目组"],
    "address": "北京市海淀区中关村"
  },
  {
    "id": "contact-2",
    "name": "李四",
    "phone": "13900139002",
    "email": "lisi@example.com",
    "tags": ["客户"],
    "address": "上海市浦东新区"
  },
  {
    "id": "contact-3",
    "name": "王五",
    "phone": "13700137000",
    "email": "wangwu@example.com",
    "tags": ["朋友"],
    "address": "广州市天河区"
  }
]`;

export const version3 = `[
  {
    "id": "contact-1",
    "name": "张三(技术总监)",
    "phone": "13888888888",
    "email": "zhangsan@newemail.com",
    "tags": ["同事", "技术部", "管理层"],
    "address": "北京市朝阳区"
  },
  {
    "id": "contact-2",
    "name": "李四",
    "phone": "13900139000",
    "email": "lisi@company.com",
    "tags": ["合作伙伴", "重要客户"],
    "address": "上海市浦东新区张江高科技园区"
  },
  {
    "id": "contact-3",
    "name": "王五",
    "phone": "13700137000",
    "email": "wangwu@example.com",
    "tags": ["朋友"],
    "address": "广州市天河区"
  },
  {
    "id": "contact-4",
    "name": "赵六",
    "phone": "13600136000",
    "email": "zhaoliu@example.com",
    "tags": ["客户"],
    "address": "深圳市南山区"
  }
]`;

export const defaultSchemaData: Schema = {
    $type: 'array',
    $item: {
        $type: 'object',
        $pk: 'id',
        $fields: {
            id: { $type: 'string' },
            name: { $type: 'string' },
            phone: { $type: 'string' },
            email: { $type: 'string' },
            tags: {
                $type: 'array',
                $item: { $type: 'string' },
            },
            address: { $type: 'string' },
        },
    },
};
