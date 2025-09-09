export const removeSpace = (value: string): string => {
    return value.replace(/[^\w\s-]/g, '').replace(/\s/g, '-').toLowerCase();
};
