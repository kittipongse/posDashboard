export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const roundQty = (value) => Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
