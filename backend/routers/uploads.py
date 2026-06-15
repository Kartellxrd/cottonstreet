from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from auth import verify_token
from cloudinary_util import upload_image, delete_image

router = APIRouter()


@router.post("/image")
async def upload(
    file: UploadFile = File(...),
    _: str = Depends(verify_token),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    contents = await file.read()
    return upload_image(contents)


@router.delete("/image/{public_id:path}")
def remove_image(public_id: str, _: str = Depends(verify_token)):
    delete_image(public_id)
    return {"message": "Image deleted"}
