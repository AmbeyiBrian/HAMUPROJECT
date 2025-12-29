"""
Management command to reset PostgreSQL sequences for all tables.
Run this after data migrations or whenever you get duplicate key errors.

Usage: python manage.py reset_sequences
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Reset PostgreSQL sequences to max(id) + 1 for all tables'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Get all tables with sequences
            cursor.execute("""
                SELECT 
                    table_name,
                    column_name,
                    pg_get_serial_sequence(table_name, column_name) as sequence_name
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND column_default LIKE 'nextval%'
                ORDER BY table_name;
            """)
            
            sequences = cursor.fetchall()
            
            if not sequences:
                self.stdout.write(self.style.WARNING('No sequences found'))
                return
            
            self.stdout.write(f'Found {len(sequences)} sequences to reset:\n')
            
            for table_name, column_name, sequence_name in sequences:
                if not sequence_name:
                    continue
                    
                try:
                    # Get current max ID
                    cursor.execute(f'SELECT COALESCE(MAX("{column_name}"), 0) FROM "{table_name}"')
                    max_id = cursor.fetchone()[0]
                    
                    # Get current sequence value
                    cursor.execute(f"SELECT last_value FROM {sequence_name}")
                    current_val = cursor.fetchone()[0]
                    
                    # Reset sequence if needed
                    new_val = max_id + 1
                    if current_val < new_val:
                        cursor.execute(f"SELECT setval('{sequence_name}', {new_val}, false)")
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ {table_name}.{column_name}: {current_val} → {new_val}')
                        )
                    else:
                        self.stdout.write(
                            self.style.HTTP_INFO(f'  - {table_name}.{column_name}: OK (seq={current_val}, max={max_id})')
                        )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ {table_name}.{column_name}: {str(e)}')
                    )
            
            self.stdout.write(self.style.SUCCESS('\nSequence reset complete!'))
