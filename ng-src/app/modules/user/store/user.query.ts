import { Injectable } from '@angular/core';
import { Order, QueryConfig, QueryEntity } from '@datorama/akita';
import { UserStore, UserState } from './user.store';

@QueryConfig<UserState>({
	sortBy: 'userNameComplete',
	sortByOrder: Order.ASC,
})
@Injectable({ providedIn: 'root' })
export class UserQuery extends QueryEntity<UserState> {
	constructor(protected override store: UserStore) {
		super(store);
	}

  selectAllUsers() {
		return this.selectAll({
			filterBy: (e) => e.userNameComplete.trim().length > 0,
		});
	}
}
