from pathlib import Path

path = Path('client/src/pages/TempleAttendance.tsx')
text = path.read_text(encoding='utf-8').splitlines()

for idx, line in enumerate(text, 1):
    if 'const [reservations, setReservations]' in line:
        print('reservations', idx)
    if 'const [filterTripId, setFilterTripId]' in line:
        print('filterTripId', idx)
    if 'const handleDelete = async (id: number) => {' in line:
        print('handleDelete', idx)
    if 'onClick={handlePrintReport}' in line:
        print('printButton', idx, line)
    if '<div className="table-container">' in line:
        print('tableContainer', idx)
