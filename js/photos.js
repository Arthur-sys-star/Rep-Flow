/* Small compressed repair photos share the browser's localStorage quota. */
'use strict';
const PhotoStore = {
  async get(id) { return Storage.database().photo_data?.[id] || null; },
  async put(id,dataUrl) {
    return Storage.locked(()=>{const db=Storage.database();db.photo_data=db.photo_data||{};db.photo_data[id]=dataUrl;Storage.write(db);});
  },
  async remove(id) {
    return Storage.locked(()=>{const db=Storage.database();if(db.photo_data)delete db.photo_data[id];Storage.write(db);});
  },
  readAndCompress(file,maxDim=800,quality=.65) {
    return new Promise((resolve,reject)=>{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type))return reject(new Error('Choose a JPEG, PNG, or WebP image.'));
      const img=new Image(),url=URL.createObjectURL(file);
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('This image could not be opened.'));};
      img.onload=()=>{
        URL.revokeObjectURL(url);const scale=Math.min(1,maxDim/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
        let data=canvas.toDataURL('image/jpeg',quality);
        if(data.length>260000)data=canvas.toDataURL('image/jpeg',.4);
        if(data.length>350000)return reject(new Error('This image is too detailed for localStorage. Choose a smaller image.'));
        resolve(data);
      };img.src=url;
    });
  }
};
