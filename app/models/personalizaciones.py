"""
Repository — Personalizaciones
"""
from app.models.db_manager import DatabaseManager


class PersonalizacionesRepository:

    @staticmethod
    def _format(row):
        if not row:
            return None
        p = dict(row)
        if p.get('id'):
            p['id'] = str(p['id'])
        if p.get('precio') is not None:
            p['precio'] = float(p['precio'])
        if p.get('costo_por_mil_puntadas') is not None:
            p['costo_por_mil_puntadas'] = float(p['costo_por_mil_puntadas'])
        for f in ['created_at', 'updated_at']:
            if p.get(f) and hasattr(p[f], 'isoformat'):
                p[f] = p[f].isoformat()
        return p

    @staticmethod
    def get_all(include_inactive=False):
        where = "" if include_inactive else "WHERE activo = true"
        query = f"""
            SELECT id, codigo, tipo, descripcion, precio, tiempo_adicional_dias,
                   metodo_calculo, costo_por_mil_puntadas, activo
            FROM personalizaciones {where}
            ORDER BY tipo
        """
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query)
            return [PersonalizacionesRepository._format(row) for row in cursor.fetchall()]

    @staticmethod
    def get_by_codigo(codigo):
        query = "SELECT * FROM personalizaciones WHERE codigo = %s AND activo = true"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (codigo,))
            return PersonalizacionesRepository._format(cursor.fetchone())

    @staticmethod
    def get_by_codigos(codigos):
        """Batch-fetch personalizaciones by code list."""
        if not codigos:
            return {}
        placeholders = ','.join(['%s'] * len(codigos))
        query = f"SELECT * FROM personalizaciones WHERE codigo IN ({placeholders}) AND activo = true"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, list(codigos))
            return {
                PersonalizacionesRepository._format(row)['codigo']: PersonalizacionesRepository._format(row)
                for row in cursor.fetchall()
            }

    @staticmethod
    def get_by_id(pid):
        query = "SELECT * FROM personalizaciones WHERE id = %s"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (pid,))
            return PersonalizacionesRepository._format(cursor.fetchone())

    @staticmethod
    def create(data):
        query = """
            INSERT INTO personalizaciones (codigo, tipo, descripcion, precio,
                                           tiempo_adicional_dias, metodo_calculo,
                                           costo_por_mil_puntadas)
            VALUES (%(codigo)s, %(tipo)s, %(descripcion)s, %(precio)s,
                    %(tiempo_adicional_dias)s, %(metodo_calculo)s,
                    %(costo_por_mil_puntadas)s)
            RETURNING id, codigo, tipo
        """
        if 'metodo_calculo' not in data:
            data['metodo_calculo'] = 'fijo'
        if 'costo_por_mil_puntadas' not in data:
            data['costo_por_mil_puntadas'] = 0
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, data)
            result = dict(cursor.fetchone())
            if result.get('id'):
                result['id'] = str(result['id'])
            return result

    @staticmethod
    def update(pid, data):
        query = """
            UPDATE personalizaciones SET
                tipo = %(tipo)s, descripcion = %(descripcion)s,
                precio = %(precio)s, tiempo_adicional_dias = %(tiempo_adicional_dias)s,
                metodo_calculo = %(metodo_calculo)s,
                costo_por_mil_puntadas = %(costo_por_mil_puntadas)s
            WHERE id = %(id)s
            RETURNING id, codigo, tipo
        """
        data['id'] = pid
        data.setdefault('metodo_calculo', 'fijo')
        data.setdefault('costo_por_mil_puntadas', 0)
        data.setdefault('descripcion', None)
        data.setdefault('tiempo_adicional_dias', 0)
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, data)
            row = cursor.fetchone()
            if row:
                r = dict(row)
                if r.get('id'):
                    r['id'] = str(r['id'])
                return r
            return None

    @staticmethod
    def toggle_active(pid, activo):
        query = "UPDATE personalizaciones SET activo = %s WHERE id = %s RETURNING id"
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute(query, (activo, pid))
            return cursor.fetchone() is not None
