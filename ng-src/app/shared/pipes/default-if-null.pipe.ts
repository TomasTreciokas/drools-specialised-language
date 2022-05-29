import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'defaultIfNull',
})
export class DefaultIfNullPipe implements PipeTransform {
    transform<T, V>(val: NonNullable<T>, def: V): NonNullable<T>;

    transform<T extends any | null | undefined, V>(val: T, def: V): NonNullable<T> | V;

    transform<T, V>(val: T, def: V): NonNullable<T> | V {
        if (val == undefined || val == null) return def;
        return val as NonNullable<T>;
    }
}
