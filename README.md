[TOC]

# FileSystem APIs

## 接口类型

### DOMFileSystem

#### root : _`DirectoryEntry`_

> 根目录

#### name : _`String`_

> 名称



### DirectoryEntry & FileEntry _inherit from_ `Entry`

* ### properties

  - #### filesystem : _`DOMFileSystem`_

    > 指向 DOMFileSystem

  - #### fullPath : _`String`_

    > 绝对路径

  - #### isDirectory : _`Boolean`_

    > 是否是 folder

  - #### isFile : _`Boolean`_

    > 是否是 file

  - #### name : _`String`_

    > 文件名

    ​

* ### methods

  - ####  createWriter: _(callback: (writer: FileWriter) => void) => void_ (FileEntry Only)

    > 写

    ```typescript
    fileEntry.createWriter(function(fileWriter) {
      fileWriter.onwriteend = function(e) {
        // success todo...
      }

      fileWriter.onerror = function(e) {
        // fail todo...
      }
      
      fileWriter.write(new Blob(['...'],
      { type: 'text/plain;charset=UTF-8', endings: 'native' /* 'transparet' */ }
      ));

    }, errorHandler);
    ```

  - #### file: _(callback: (file: File) => void) => void_ (FileEntry Only)

    > 读

    ```typescript
    fileEntry.file(function(file: File) {
      const reader = new FileReader();
      reader.onloadend = function (e) {
    	// success todo...
      }

      reader.onerror = function (e) {
        // fail todo...
      }

      reader.readAsText(file);
    }, errorHandler);
    ```

  - #### copyTo: _(dirEntry: DirectoryEntry, newName?: String, successCallback?, errorCallback?)_ => void

    > 复制

    ```typescript
    root.getFile(filename, {}, function(fileEntry: FileEntry) {// get fileEntry
      root.getDirectory(dest, {}, function(dirEntry: DirectoryEntry) {// get dest dirEntry
        fileEntry.copyTo(dirEntry, newName, onsuccess, onerror));
      });
    });
    ```

  - #### moveTo: _(dest: DirectoryEntry, newName?: String, successCallback?: (newEntry: FileEntry) => void, errorCallback?: (err) => void) => void_

    > 剪切

    ```typescript
    function rename(cwd: DirectoryEntry, src: String, newName: String) {
      cwd.getFile(src, {}, function(fileEntry) {
        fileEntry.moveTo(cwd, newName);
      }, errorHandler);
    }
    ```

  - #### createReader: _DirectoryReader_ (DirectoryEntry Only)

    > 读文件夹

    ```typescript
    const reader = root.createReader();
    reader.readEntries(function(results: Array<Entry>) {
      if (!results.length) {
        // is empty folder
      } else {
        const fileEntryList = results.filter(
          function(entry) { return entry.isFile; }
        );

        const directoryEntryList = results.filter(
          function(entry) { return entry.isDirectory; }
        );
      }
    });
    ```

  - #### getFile & getDirectory: _(pathname: String, opts:{create?: Boolean, exclusive?: Boolean}, successCallback?: (fileEntry: FileEntry) => void, errorCallback?) => void_  (DirectoryEntry Only)

    > 创建、获取文件

    ```typescript
    fs.root.getFile(src, {}, function(fileEntry: FileEntry) {

      fs.root.getDirectory(dirName, {}, function(dirEntry: DirectoryEntry) {
        fileEntry.moveTo(dirEntry);
      }, errorHandler);

    }, errorHandler);
    ```

  - #### toURL: _String_

    ```typescript
    const img = new Image(fileEntry.toURL());
    document.body.append(img);
    ```

  - #### remove: _(successCallback?: () => void, errorCallback?: (err: Error) => void) => void_

    > 删

    ```typescript
    fileEntry.remove(function() {
      // removed successfully...
    }, function(err) {
      // failed...
    });
    ```

  - #### getMetaData: _(callback: (metadata: Metadata) => void) => void_

    > 获取文件信息（最后变更时间、大小）

    ```typescript
    fs.root.getFile('folderA/folderB/file.jpg', {}, function(fileEntry: FileEntry) {
      fileEntry.getMetaData(function(metadata: Metadata) {
        console.log(metadata);
      });
    }, errorHandler);
    ```

    ​

    ​