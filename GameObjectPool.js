/**
 * Created by simabenteng on 2017/7/9.
 *
 * 适用于具有gId属性的gameObject对象
 * gId格式：'gameObjectType_唯一标识符'
 * gameObjectType为gameObject.constructor.name
 */
'use strict';

const pool = Symbol('pool');
class GameObjectPool
{
	constructor()
	{
		this[pool] = new Map();
	}
	
	addGameObject(gameObject)
	{
		const type = gameObject.constructor.name;
		if (type == 'Object')
		{
			throw new Error('gameObject 尚未初始化');
		}
		else
		{
			const gId = gameObject.gId;
			if (gId == null || gId == '')
			{
				throw new Error('gameObject gId 不存在');
			}
			if (!this[pool].has(type))
			{
				this[pool].set(type, new Map());
			}
			this[pool].get(type).set(gId, gameObject);
			return true;
		}
	}
	
	removeGameObject(gameObject)
	{
		const type = gameObject.constructor.name;
		if (type == 'Object')
		{
			throw new Error('gameObject 尚未初始化');
		}
		else
		{
			const gId = gameObject.gId;
			if (gId == null || gId == '')
			{
				throw new Error('gameObject gId 不存在');
			}
			if (this[pool].has(type))
			{
				const typePool = this[pool].get(type);
				typePool.delete(gId);
				if (typePool.size == 0)
				{
					this[pool].delete(type);
				}
				return true;
			}
		}
	}
	
	forEachGameObject(callBack, ...types)
	{
		if (types == null || types == '')
		{
			for (const [type, typePool] of this[pool])
			{
				for (const [k, v] of typePool)
				{
					callBack(v, k);
				}
			}
			return;
		}
		for (let i = 0; i < types.length; i ++)
		{
			const type = types[i];
			if (type != null && type != '')
			{
				if (this[pool].has(type))
				{
					const typePool = this[pool].get(type);
					for (const [k, v] of typePool)
					{
						callBack(v, k);
					}
				}
			}
		}
	}
	
	clear(...types)
	{
		if (types == null || types == '')
		{
			this[pool].clear();
			return;
		}
		for (let i = 0; i < types.length; i ++)
		{
			const type = types[i];
			if (type != null && type != '')
			{
				if (this[pool].has(type))
				{
					const typePool = this[pool].get(type);
					typePool.clear();
					this[pool].delete(type);
				}
			}
		}
	}
	
	static GetGameObjectTypeByGID(gId)
	{
		if (typeof gId == 'string')
		{
			const type = gId.split('_')[0];
			if (type.length > 0)
			{
				return type.charAt(0).toUpperCase() + type.substr(1);
			}
		}
	}
	
	getGameObjectByGID(gId)
	{
		const type = this.constructor.GetGameObjectTypeByGID(gId);
		if (this[pool].has(type))
		{
			return this[pool].get(type).get(gId);
		}
	}
	
	hasGameObject(gameObject)
	{
		const type = gameObject.constructor.name;
		if (this[pool].has(type))
		{
			if (this[pool].get(type).has(gameObject.gId))
			{
				return true;
			}
		}
		return false;
	}
}
module.exports = GameObjectPool;
