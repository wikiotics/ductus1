/* 
* Copyright (c) 2011
* Spoken Language Systems Group
* MIT Computer Science and Artificial Intelligence Laboratory
* Massachusetts Institute of Technology
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use, copy,
* modify, merge, publish, distribute, sublicense, and/or sell copies
* of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
* BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
* ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/
package edu.mit.csail.wami.record
{	
	import edu.mit.csail.wami.utils.External;
	import edu.mit.csail.wami.utils.Pipe;
	import edu.mit.csail.wami.utils.StateListener;
	
	import flash.utils.ByteArray;
	
	public class MultiPost extends Pipe
	{
		private var url:String;
		private var contentType:String = null;
		private var partIndex:int = 0;
		private var listener:StateListener;
		private var timeoutMillis:int;
		private var total:int = 0;
		
		/**
		 * Does of POST of the data passed in to every call to "write"
		 */
		public function MultiPost(url:String, type:String, timeoutMillis:int, listener:StateListener)
		{
			this.url = url;
			this.contentType = type;
			this.listener = listener;
			this.timeoutMillis = timeoutMillis;
		}
		
		override public function write(bytes:ByteArray):void
		{
			var type:String = contentType.replace("%s", partIndex++);
			var post:Pipe = new SinglePost(url, type, timeoutMillis, listener);
			post.write(bytes);
			post.close();
			total += bytes.length;
		}
		
		// A final POST containing a -1 signifies the end of the MultiPost stream.
		override public function close():void
		{
			External.debug("Total multi-posted bytes: " + total);
			var arr:ByteArray = new ByteArray();
			arr.writeInt(-1);
			arr.position = 0;
			write(arr);
			super.close();
		}
	}		
}