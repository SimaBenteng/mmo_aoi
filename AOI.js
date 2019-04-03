/**
 * Created by simabenteng on 2017/7/6.
 */
'use strict';
const QuadTree = require('./QuadTree');
const GameObjectPool = require('./GameObjectPool');

class AOI
{
	constructor(width, height, updateFPS)
	{
		const mapSize = {
			x      : 0,
			y      : 0,
			width  : width,
			height : height
		};
		this.quadTreeWatchers = QuadTree.init(mapSize);
		this.quadTreeGameObjects = QuadTree.init(mapSize);
		
		this.watchers = new GameObjectPool();
		this.gameObjects = new GameObjectPool();
		this.updateFPS = updateFPS;
		this.oldVisibleObjects = new Map();
		this.visionRadiusKey = 'visionRadius';
		this.collisionRadiusKey = 'collisionRadius';
	}
	
	static CreateAOI(width, height, visionRadiusKey, collisionRadiusKey)
	{
		const aoi = new AOI(width, height, 10);
		if (visionRadiusKey != null)
		{
			aoi.visionRadiusKey = visionRadiusKey;
		}
		if (collisionRadiusKey != null)
		{
			aoi.collisionRadiusKey = collisionRadiusKey;
		}
		return aoi;
	}
	
	static Rect(x, y, radius)
	{
		let r = radius;
		if (r == null)
			r = 0;
		const diameter = r * 2;
		return {
			x      : x,
			y      : y,
			width  : diameter,
			height : diameter
		};
	}
	
	static Dis(x1, y1, x2, y2)
	{
		return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
	}
	
	static CouldBeWatch(watcherX, watcherY, visionRadius, objectX, objectY, collisionRadius)
	{
		const dis = this.Dis(watcherX, watcherY, objectX, objectY);
		const d = visionRadius + collisionRadius;
		return dis < d;
	}
	
	setGameObject(gameObject)
	{
		const visionRadius = gameObject[this.visionRadiusKey];
		if (visionRadius > 0)
		{
			if (this.watchers.addGameObject(gameObject))
			{
				this.dataChangedWatcher = true;
				this.dataChangedUpdate = true;
			}
		}
		if (this.gameObjects.addGameObject(gameObject))
		{
			this.dataChangedGameObject = true;
			this.dataChangedUpdate = true;
		}
	}
	
	removeGameObject(gameObject)
	{
		if (this.watchers.removeGameObject(gameObject))
		{
			this.dataChangedWatcher = true;
			this.dataChangedUpdate = true;
		}
		if (this.gameObjects.removeGameObject(gameObject))
		{
			this.dataChangedGameObject = true;
			this.dataChangedUpdate = true;
		}
	}
	
	onGameObjectPropertyChanged(gameObject)
	{
		const visionRadius = gameObject[this.visionRadiusKey];
		const isWatcherNow = visionRadius > 0;
		const isWatcherBefore = this.watchers.hasGameObject(gameObject);
		if (isWatcherNow)
		{
			if (!isWatcherBefore)
			{
				this.watchers.addGameObject(gameObject);
			}
			this.dataChangedWatcher = true;
		}
		else
		{
			if (isWatcherBefore)
			{
				this.watchers.removeGameObject(gameObject);
				this.dataChangedWatcher = true;
			}
		}
		this.dataChangedGameObject = true;
		this.dataChangedUpdate = true;
	}
	
	setWatchersQuadTree()
	{
		this.watchers.forEachGameObject(watcher =>
		{
			if (watcher.isInBattle)
				return;
			const position = watcher.position;
			if (position != null)
			{
				const visionRadius = watcher[this.visionRadiusKey];
				if (visionRadius > 0)
				{
					const rect = this.constructor.Rect(position.x, position.y, visionRadius);
					rect.objectId = watcher.gId;
					this.quadTreeWatchers.insert(rect);
				}
			}
		});
	}
	
	setGameObjectQuadTree()
	{
		this.gameObjects.forEachGameObject(gameObject =>
		{
			if (gameObject.invisible)
				return;
			const position = gameObject.position;
			if (position != null)
			{
				let collisionRadius = gameObject[this.collisionRadiusKey];
				if (collisionRadius == null)
					collisionRadius = 0;
				const rect = this.constructor.Rect(position.x, position.y, collisionRadius);
				rect.objectId = gameObject.gId;
				this.quadTreeGameObjects.insert(rect);
			}
		});
	}
	
	getWatchedObjects(watcher)
	{
		const position = watcher.position;
		if (position != null)
		{
			let visionRadius = watcher[this.visionRadiusKey];
			visionRadius = visionRadius ? visionRadius : 0;
			const result = [];
			if (watcher.isInBattle)
			{
				const battleRoles = watcher.battleRoles;
				for (let i = 0; i < battleRoles.length; i ++)
				{
					const battleRole = battleRoles[i];
					if (battleRole.invisible)
						continue;
					result.push(battleRole.gId);
				}
			}
			else
			{
				const rect = this.constructor.Rect(position.x, position.y, visionRadius);
				rect.objectId = watcher.gId;
				this.quadTreeGameObjects.retrieve(rect, (candidate) => {
					const couldBeWatch = this.constructor.CouldBeWatch(position.x,
					                                                   position.y,
					                                                   visionRadius,
					                                                   candidate.x,
					                                                   candidate.y,
					                                                   candidate.width / 2);
					if (couldBeWatch)
					{
						result.push(candidate.objectId);
					}
				});
			}
			return result;
		}
	}

	getGameObjectsIdInCircle(center, radius)
	{
	    const result = [];
        const rect = this.constructor.Rect(center.x, center.y, radius);
        this.quadTreeGameObjects.retrieve(rect, (candidate) =>
		{
            const dis = this.Dis(center.x, center.y, candidate.x, candidate.y);
            if (dis < radius)
            {
                result.push(candidate.objectId);
            }
		});
        return result;
	}
	
	getWatchers(gameObject)
	{
		if (this.dataChangedWatcher)
		{
			this.quadTreeWatchers.clear();
			this.setWatchersQuadTree();
			this.dataChangedWatcher = false;
		}
		
		const position = gameObject.position;
		if (position != null)
		{
			let collisionRadius = gameObject[this.collisionRadiusKey];
			collisionRadius = collisionRadius ? collisionRadius : 0;
			const rect = this.constructor.Rect(position.x, position.y, collisionRadius);
			rect.objectId = gameObject.gId;
			const result = [];
			this.quadTreeWatchers.retrieve(rect, (candidate) =>
			{
				if (this.constructor.CouldBeWatch(candidate.x,
				                                  candidate.y,
				                                  candidate.width / 2,
				                                  position.x,
				                                  position.y,
				                                  collisionRadius))
				{
					result.push(candidate.objectId);
				}
			});
			return result;
		}
	}
	
	_refreshVisible()
	{
		this.watchers.forEachGameObject((watcher, type) =>
		{
			const visibleObjects = this.getWatchedObjects(watcher);
			const hasOldVisibleObjects = this.oldVisibleObjects.has(watcher.gId);
			const hasVisibleObjects = visibleObjects != null && visibleObjects.length > 0;
			if (!hasVisibleObjects && !hasOldVisibleObjects)
				return;
			if (hasOldVisibleObjects)
				watcher.emit('visionUpdate', visibleObjects, this.oldVisibleObjects.get(watcher.gId));
			else
				watcher.emit('visionUpdate', visibleObjects, []);
			this.oldVisibleObjects.set(watcher.gId, visibleObjects);
		});
	}
	
	update()
	{
		try
		{
			if (!this.dataChangedUpdate)
				return;
			if (this.dataChangedGameObject)
			{
				this.quadTreeGameObjects.clear();
				this.setGameObjectQuadTree();
				this.dataChangedGameObject = false;
			}
			this._refreshVisible();
			this.dataChangedUpdate = false;
		}
		catch (error)
		{
			console.error(error);
		}
	}
	
	start()
	{
		this.timeOut = setInterval(this.update.bind(this), 1000 / this.updateFPS);
	}
	
	stop()
	{
		clearInterval(this.timeOut);
		this.oldVisibleObjects.clear();
		this.watchers.clear();
		this.gameObjects.clear();
	}
}
module.exports = AOI;