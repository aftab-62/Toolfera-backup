from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pdfencrypt import StandardEncryption
from PIL import Image, ImageDraw
import sys
import textwrap
root=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/scratch/utilityhub-pdf-qa9')
root.mkdir(parents=True, exist_ok=True)
source=str(root/'source-illustration.png')
image=Image.new('RGB',(640,400),'#ecf3ff')
draw=ImageDraw.Draw(image)
draw.rectangle((45,45,595,355),outline='#243f6e',width=4)
draw.ellipse((95,95,295,295),fill='#245bdb')
draw.rectangle((350,130,545,270),fill='#69cbdc')
image.save(source)
Image.open(source).convert('RGB').save(root/'landscape.jpg',quality=88)
Image.open(source).resize((200,320)).save(root/'portrait.png')
def lines(c,text,y,font='Helvetica',size=11,width=86):
    c.setFont(font,size)
    for line in textwrap.wrap(text,width):
        c.drawString(54,y,line); y-=14
    return y
c=canvas.Canvas(str(root/'structured.pdf'),pagesize=(612,792))
c.setFont('Helvetica-Bold',22);c.drawString(54,738,'UtilityHub conversion review')
y=lines(c,'This text-based PDF tests editable paragraphs and line breaks. The converted document should preserve these sentences, rather than placing an entire page into a picture.',704)
y=lines(c,'A second paragraph checks the structure of the document. Readers should be able to edit the wording and the image should remain a separate object in Word.',y-20)
c.setFont('Helvetica-Oblique',11);c.drawString(54,y-20,'This sentence tests italic formatting.')
c.setFont('Helvetica-Bold',15);c.drawString(54,568,'Simple table')
for row,values in enumerate([('Tool','Format','Pages'),('Image export','PNG','2'),('Image export','JPG','2'),('Word conversion','DOCX','2')]):
    c.setFont('Helvetica-Bold' if row==0 else 'Helvetica',11)
    for x,value in zip([54,300,450],values): c.drawString(x,538-row*24,value)
c.drawImage(source,54,286,width=180,height=112.5,mask='auto')
c.setFont('Helvetica',10);c.drawString(54,268,'Local sample illustration')
c.setFont('Helvetica',11);c.drawString(54,232,'1. Review the editable text.');c.drawString(54,212,'2. Check the image and table.')
c.showPage();c.setFont('Helvetica-Bold',22);c.drawString(54,738,'Second page verification')
y=lines(c,'This is the second source page. It checks page flow and section breaks in the Word document. The original page size is preserved.',704)
c.setFont('Helvetica-Bold',15);c.drawString(54,y-25,'Next steps')
lines(c,'Keep the source PDF and review the converted Word document. Complex positioning, unusual fonts and interactive forms can require manual changes.',y-55)
c.save()
c=canvas.Canvas(str(root/'paragraphs.pdf'),pagesize=(612,792))
for page in range(1,4):
    c.setFont('Times-Bold',20);c.drawString(54,738,f'Paragraph review page {page}')
    y=700
    for p in range(1,5):
        text=f'Paragraph {p} on page {page} contains editable flowing text. '+('A useful conversion keeps the wording, font size and line breaks while allowing the reader to revise the document in Word. '*2)
        y=lines(c,text,y,font='Times-Roman',size=11,width=95)-18
    c.showPage()
c.save()
c=canvas.Canvas(str(root/'scanned.pdf'),pagesize=(612,792));c.drawImage(source,0,0,width=612,height=792);c.save()
c=canvas.Canvas(str(root/'encrypted.pdf'),pagesize=(612,792),encrypt=StandardEncryption('qa-only-password',canPrint=1));c.setFont('Helvetica',12);c.drawString(54,700,'Password protected QA document.');c.save()
(root/'invalid.pdf').write_bytes(b'not a PDF')
(root/'corrupted.pdf').write_bytes(b'%PDF-1.7\ncorrupted objects')
print('Generated structured, paragraph-heavy, scan, protected, invalid and mixed-image fixtures')
