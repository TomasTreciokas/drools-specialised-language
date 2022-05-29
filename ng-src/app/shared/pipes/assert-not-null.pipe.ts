import { Pipe, PipeTransform } from '@angular/core';
import { assertNotNull } from '@shared/util';

@Pipe({
    name: 'assertNotNull',
})
export class AssertNotNullPipe implements PipeTransform {
    transform<T>(value: T): NonNullable<T> {
        assertNotNull(value, 'assertNotNullPipe: Null values are not allowed!');
        return value;
    }
}
