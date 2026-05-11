from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io
import os

router = APIRouter(prefix="/api/pdf", tags=["PDF"])

async def generate_pdf_async(html: str):
    try:
        from pyppeteer import launch
    except ImportError as exc:
        raise RuntimeError("pyppeteer no esta instalado. Instale las dependencias del backend para generar PDF desde HTML.") from exc

    browser = None
    try:
        executable_path = os.getenv("CHROMIUM_PATH")
        args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
        
        browser = await launch(
            headless=True,
            executablePath=executable_path,
            args=args
        )
        page = await browser.newPage()
        await page.setContent(html, waitUntil='networkidle0', timeout=30000)
        
        pdf = await page.pdf({
            'format': 'A4',
            'printBackground': True,
            'margin': {'top': '0', 'bottom': '0', 'left': '0', 'right': '0'},
            'scale': 1
        })
        
        return pdf
    finally:
        if browser:
            await browser.close()

@router.post("/generate")
async def generate_pdf(data: dict):
    html = data.get('html', '')
    filename = data.get('filename', 'invoice.pdf')
    
    if not html:
        raise HTTPException(status_code=400, detail="HTML content is required")
    
    try:
        pdf = await generate_pdf_async(html)
        return StreamingResponse(
            io.BytesIO(pdf),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
