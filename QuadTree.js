/*
 * Javascript QuadTree
 * @version 1.1.1
 * @licence MIT
 * @author Timo Hausmann
 * https://github.com/timohausmann/quadtree-js/
 */
 
/*
 Copyright © 2012 Timo Hausmann

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENthis. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
'use strict';

class QuadTree
{
	/**
	 * QuadTree Constructor
	 * @param {Object} bounds	 bounds of the node, object with x, y, width, height
	 * @param {Number} maxObjects (optional) max objects a node can hold before splitting into 4 subnodes (default: 10)
	 * @param {Number} maxLevels (optional) total max levels inside root QuadTree (default: 4)
	 * @param {Number} level (optional) deepth level, required for subnodes
	 */
	constructor(bounds, maxObjects, maxLevels, level)
	{
		this.maxObjects	= maxObjects || 10;
		this.maxLevels		= maxLevels || 4;
		
		this.level 		= level || 0;
		this.bounds 		= bounds;
		
		this.objects 		= [];
		this.nodes 		= [];
	}
	
	/**
	 * Split the node into 4 subnodes
	 */
	split()
	{
		const nextLevel = this.level + 1,
			subWidth	= Math.round(this.bounds.width / 2),
			subHeight 	= Math.round(this.bounds.height / 2),
			x 		= Math.round(this.bounds.x),
			y 		= Math.round(this.bounds.y);
		
		// top right node
		this.nodes[0] = new QuadTree({
			                             x     	: x + subWidth,
			                             y     	: y,
			                             width 	: subWidth,
			                             height	: subHeight
		                             }, this.maxObjects, this.maxLevels, nextLevel);
		
		// top left node
		this.nodes[1] = new QuadTree({
			                             x     	: x,
			                             y     	: y,
			                             width 	: subWidth,
			                             height	: subHeight
		                             }, this.maxObjects, this.maxLevels, nextLevel);
		
		// bottom left node
		this.nodes[2] = new QuadTree({
			                             x     	: x,
			                             y     	: y + subHeight,
			                             width 	: subWidth,
			                             height	: subHeight
		                             }, this.maxObjects, this.maxLevels, nextLevel);
		
		// bottom right node
		this.nodes[3] = new QuadTree({
			                             x     	: x + subWidth,
			                             y     	: y + subHeight,
			                             width 	: subWidth,
			                             height	: subHeight
		                             }, this.maxObjects, this.maxLevels, nextLevel);
	}
	
	/**
	 * Determine which node the object belongs to
	 * @param {Object} pRect	bounds of the area to be checked, with x, y, width, height
	 * @return {Number} index of the subnode (0-3), or -1 if pRect cannot completely fit within a subnode and is part of the parent node
	 */
	getIndex(pRect)
	{
		let 	index = -1;
		const verticalMidpoint 	= this.bounds.x + (this.bounds.width / 2),
			horizontalMidpoint 	= this.bounds.y + (this.bounds.height / 2),
			// pRect can completely fit within the top quadrants
			topQuadrant = (pRect.y < horizontalMidpoint && pRect.y + pRect.height < horizontalMidpoint),
			// pRect can completely fit within the bottom quadrants
			bottomQuadrant = (pRect.y > horizontalMidpoint);
		// pRect can completely fit within the left quadrants
		if (pRect.x < verticalMidpoint && pRect.x + pRect.width < verticalMidpoint)
		{
			if (topQuadrant)
			{
				index = 1;
			}
			else if (bottomQuadrant)
			{
				index = 2;
			}
			// pRect can completely fit within the right quadrants
		}
		else if (pRect.x > verticalMidpoint)
		{
			if (topQuadrant)
			{
				index = 0;
			}
			else if (bottomQuadrant)
			{
				index = 3;
			}
		}
		return index;
	}
	
	/**
	 * Insert the object into the node. If the node
	 * exceeds the capacity, it will split and add all
	 * objects to their corresponding subnodes.
	 * @param {Object} pRect bounds of the object to be added, with x, y, width, height
	 */
	insert(pRect)
	{
		let 	i = 0,
			index;
		
		// if we have subnodes ...
		if (typeof this.nodes[0] !== 'undefined')
		{
			index = this.getIndex(pRect);
			
			if (index !== -1)
			{
				this.nodes[index].insert(pRect);
				return;
			}
		}
		
		this.objects.push(pRect);
		
		if (this.objects.length > this.maxObjects && this.level < this.maxLevels)
		{
			
			// split if we don't already have subnodes
			if (typeof this.nodes[0] === 'undefined')
			{
				this.split();
			}
			
			// add all objects to there corresponding subnodes
			while (i < this.objects.length)
			{
				
				index = this.getIndex(this.objects[i]);
				
				if (index !== -1)
				{
					this.nodes[index].insert(this.objects.splice(i, 1)[0]);
				}
				else
				{
					i = i + 1;
				}
			}
		}
	}
	
	/**
	 * Return all objects that could collide with the given object
	 * @param {Object} pRect bounds of the object to be checked, with x, y, width, height
	 * @Return {Array} array with all detected objects
	 */
	retrieve(pRect)
	{
		const index = this.getIndex(pRect);
		let returnObjects = this.objects;
		
		// if we have subnodes ...
		if (typeof this.nodes[0] !== 'undefined')
		{
			
			// if pRect fits into a subnode ..
			if (index !== -1)
			{
				returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
				
				// if pRect does not fit into a subnode, check it against all subnodes
			}
			else
			{
				for (let i = 0; i < this.nodes.length; i = i + 1)
				{
					returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
				}
			}
		}
		return returnObjects;
	}
	
	/**
	 * Clear the quadtree
	 */
	clear()
	{
		this.objects = [];
		
		for (let i = 0; i < this.nodes.length; i = i + 1)
		{
			if (typeof this.nodes[i] !== 'undefined')
			{
				this.nodes[i].clear();
			}
		}
		this.nodes = [];
	}
}
module.exports = QuadTree;