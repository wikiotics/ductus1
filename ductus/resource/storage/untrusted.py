# Ductus
# Copyright (C) 2009  Jim Garrison <jim@garrison.cc>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import os

from ductus.resource import check_resource_size, calculate_hash, hash_name, hash_algorithm, hash_encode
from ductus.util import iterator_to_tempfile, iterate_file_then_delete
from ductus.resource.storage.noop import WrapStorageBackend

def _wrap_getitem(original_getitem):
    def wrapped_getitem(s, key):
        data_iterator = original_getitem(s, key)
        max_resource_size = getattr(s, "max_resource_size", (20*1024*1024))
        data_iterator = check_resource_size(data_iterator, max_resource_size)

        # Calculate hash and save to temporary file
        hash_obj = hash_algorithm()
        data_iterator = calculate_hash(data_iterator, hash_obj)
        tmpfile = iterator_to_tempfile(data_iterator)

        # Verify hash
        try:
            digest = hash_encode(hash_obj.digest())
            if key != "urn:%s:%s" % (hash_name, digest):
                raise "URN given does not match content." # valueerror
        except:
            os.remove(tmpfile)
            raise

        return iterate_file_then_delete(tmpfile)

    return wrapped_getitem

class UntrustedStorageMetaclass(type):
    def __init__(cls, name, bases, attrs):
        cls.__getitem__ = _wrap_getitem(cls.__getitem__)
        super(UntrustedStorageMetaclass, cls).__init__(name, bases, attrs)

class UntrustedStorageBackend(WrapStorageBackend):
    __metaclass__ = UntrustedStorageMetaclass

    def __init__(self, wrapped_backend, max_resource_size=None):
        if max_resource_size is not None:
            self.max_resource_size = max_resource_size
        super(UntrustedStorageBackend, self).__init__(wrapped_backend)